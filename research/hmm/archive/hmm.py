"""
Extended HMM supporting three emission distributions:
  - "gauss"     : univariate Normal
  - "student_t" : univariate Student-t (fixed degrees of freedom nu)
  - "mvn"       : multivariate Normal (D-dimensional observations)
"""

import numpy as np
from scipy.stats import norm, t as student_t, multivariate_normal
from scipy.special import logsumexp


def log_emission(x, params, emission="gauss"):
    if emission == "gauss":
        return norm.logpdf(x[:, None], loc=params["mu"][None, :], scale=params["sigma"][None, :])
    if emission == "student_t":
        nu = params["nu"]
        return student_t.logpdf(x[:, None], df=nu,
                                loc=params["mu"][None, :], scale=params["sigma"][None, :])
    if emission == "mvn":
        T = x.shape[0]
        K = params["mu"].shape[0]
        out = np.empty((T, K))
        for k in range(K):
            out[:, k] = multivariate_normal.logpdf(
                x, mean=params["mu"][k], cov=params["cov"][k], allow_singular=True)
        return out
    raise ValueError(f"Unknown emission: {emission}")


def forward_backward(log_B, log_pi, log_A):
    T, K = log_B.shape
    log_alpha = np.full((T, K), -np.inf)
    log_alpha[0] = log_pi + log_B[0]
    for t in range(1, T):
        log_alpha[t] = log_B[t] + logsumexp(log_alpha[t-1][:, None] + log_A, axis=0)
    log_lik = logsumexp(log_alpha[-1])

    log_beta = np.full((T, K), -np.inf)
    log_beta[-1] = 0.0
    for t in range(T-2, -1, -1):
        log_beta[t] = logsumexp(log_A + log_B[t+1][None, :] + log_beta[t+1][None, :], axis=1)

    log_gamma = log_alpha + log_beta - log_lik
    log_xi = (log_alpha[:-1, :, None] + log_A[None, :, :]
              + log_B[1:, None, :] + log_beta[1:, None, :] - log_lik)
    return log_alpha, log_beta, log_gamma, log_xi, log_lik


def baum_welch(sequences, K=2, n_iter=500, tol=1e-7, seed=42,
               emission="gauss", nu=5.0, min_sigma=1e-3):
    is_mvn = (emission == "mvn")

    if is_mvn:
        all_x = np.concatenate(sequences, axis=0)
        D = all_x.shape[1]
    else:
        all_x = np.concatenate(sequences)

    # Init
    if is_mvn:
        idx = np.argsort(all_x[:, 0])
        qsel = idx[np.linspace(0, len(idx)-1, K).astype(int)]
        mu = all_x[qsel].astype(float)
        cov = np.array([np.cov(all_x.T) + 1e-4 * np.eye(D) for _ in range(K)])
        params = dict(mu=mu, cov=cov)
    else:
        qs = np.quantile(all_x, np.linspace(0.15, 0.85, K))
        sigma = np.full(K, max(all_x.std() * 0.7, min_sigma))
        params = dict(mu=qs.astype(float), sigma=sigma)
        if emission == "student_t":
            params["nu"] = nu

    pi = np.full(K, 1.0 / K)
    A = np.full((K, K), 0.10 / max(K - 1, 1))
    np.fill_diagonal(A, 0.90)
    params.update(pi=pi, A=A, emission=emission)

    log_lik_prev = -np.inf
    for it in range(n_iter):
        all_log_gamma, all_log_xi, total_ll = [], [], 0.0
        for seq in sequences:
            log_B = log_emission(seq, params, emission)
            _, _, log_gamma, log_xi, log_lik = forward_backward(
                log_B, np.log(params["pi"]), np.log(params["A"]))
            all_log_gamma.append(log_gamma)
            all_log_xi.append(log_xi)
            total_ll += log_lik

        gamma_concat = np.exp(np.concatenate(all_log_gamma, axis=0))
        # pi
        pi = np.mean([np.exp(g[0]) for g in all_log_gamma], axis=0)
        pi = pi / pi.sum()
        # A
        xi_sum = sum(np.exp(x).sum(axis=0) for x in all_log_xi)
        A = xi_sum / xi_sum.sum(axis=1, keepdims=True)
        params["pi"], params["A"] = pi, A

        gamma_sum = gamma_concat.sum(axis=0)
        if is_mvn:
            mu = (gamma_concat.T @ all_x) / gamma_sum[:, None]
            cov = np.zeros((K, D, D))
            for k in range(K):
                diff = all_x - mu[k]
                w = gamma_concat[:, k]
                cov[k] = (w[:, None, None] * diff[:, :, None] * diff[:, None, :]).sum(0) / gamma_sum[k]
                cov[k] += 1e-4 * np.eye(D)
            params["mu"], params["cov"] = mu, cov
        else:
            mu = (gamma_concat * all_x[:, None]).sum(axis=0) / gamma_sum
            var = (gamma_concat * (all_x[:, None] - mu[None, :])**2).sum(axis=0) / gamma_sum
            sigma = np.sqrt(np.maximum(var, min_sigma**2))
            params["mu"], params["sigma"] = mu, sigma

        if abs(total_ll - log_lik_prev) < tol:
            break
        log_lik_prev = total_ll

    params["log_lik"] = total_ll
    params["n_iter"]  = it + 1
    return params


def viterbi(seq, params):
    emission = params["emission"]
    log_B = log_emission(seq, params, emission)
    log_pi, log_A = np.log(params["pi"]), np.log(params["A"])
    T, K = log_B.shape

    delta = np.full((T, K), -np.inf)
    psi = np.zeros((T, K), dtype=int)
    delta[0] = log_pi + log_B[0]
    for t in range(1, T):
        scores = delta[t-1][:, None] + log_A
        psi[t] = np.argmax(scores, axis=0)
        delta[t] = scores.max(axis=0) + log_B[t]
    states = np.zeros(T, dtype=int)
    states[-1] = np.argmax(delta[-1])
    for t in range(T-2, -1, -1):
        states[t] = psi[t+1, states[t+1]]
    return states


def filtered_probs(seq, params):
    emission = params["emission"]
    log_B = log_emission(seq, params, emission)
    log_pi, log_A = np.log(params["pi"]), np.log(params["A"])
    T, K = log_B.shape
    log_alpha = np.full((T, K), -np.inf)
    log_alpha[0] = log_pi + log_B[0]
    for t in range(1, T):
        log_alpha[t] = log_B[t] + logsumexp(log_alpha[t-1][:, None] + log_A, axis=0)
    log_norm = logsumexp(log_alpha, axis=1)
    return np.exp(log_alpha - log_norm[:, None])


def reorder_states(params, dim=0):
    """Sort state labels by mu[:, dim] (mvn) or mu (univariate), low->high."""
    if params["emission"] == "mvn":
        order = np.argsort(params["mu"][:, dim])
        params["mu"]  = params["mu"][order]
        params["cov"] = params["cov"][order]
    else:
        order = np.argsort(params["mu"])
        params["mu"]    = params["mu"][order]
        params["sigma"] = params["sigma"][order]
    params["pi"] = params["pi"][order]
    params["A"]  = params["A"][order][:, order]
    return params
