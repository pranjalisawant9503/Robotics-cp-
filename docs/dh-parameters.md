# Denavit-Hartenberg (D-H) Parameters & Kinematics Specification

## 5-DOF Robotic Arm D-H Table (Standard D-H Convention)

| Joint $i$ | Joint Name | $\theta_i$ (variable) | $d_i$ (mm) | $a_i$ (mm) | $\alpha_i$ (deg) | Min Angle | Max Angle |
|---|---|---|---|---|---|---|---|
| 1 | Base Yaw | $\theta_1$ | 80.0 | 0.0 | 90.0° | -180° | 180° |
| 2 | Shoulder Pitch | $\theta_2$ | 0.0 | 120.0 | 0.0° | -90° | 90° |
| 3 | Elbow Pitch | $\theta_3$ | 0.0 | 100.0 | 0.0° | -135° | 135° |
| 4 | Wrist Pitch | $\theta_4$ | 0.0 | 0.0 | 90.0° | -90° | 90° |
| 5 | Wrist Roll | $\theta_5$ | 60.0 | 0.0 | 0.0° | -180° | 180° |

---

## Standard D-H Transformation Matrix

For joint $i$, the homogeneous transformation matrix $T_i$ from frame $i-1$ to frame $i$ is defined as:

$$
T_i = R_z(\theta_i) \cdot T_z(d_i) \cdot T_x(a_i) \cdot R_x(\alpha_i)
$$

Expanded matrix form:

$$
T_i = \begin{bmatrix}
\cos\theta_i & -\sin\theta_i \cos\alpha_i & \sin\theta_i \sin\alpha_i & a_i \cos\theta_i \\
\sin\theta_i & \cos\theta_i \cos\alpha_i & -\cos\theta_i \sin\alpha_i & a_i \sin\theta_i \\
0 & \sin\alpha_i & \cos\alpha_i & d_i \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

---

## Forward Kinematics (FK)

$$
T_{0}^5 = T_1 \cdot T_2 \cdot T_3 \cdot T_4 \cdot T_5
$$

- End-effector position: $[x, y, z]^T = T_0^5(1..3, 4)$
- End-effector orientation matrix: $R = T_0^5(1..3, 1..3)$

---

## Inverse Kinematics (IK)

### Hybrid Solver Strategy
1. **Geometric Analytical Core (Joints 1–3)**:
   - Base yaw $\theta_1 = \text{atan2}(y, x)$
   - Geometric law of cosines on shoulder link ($a_2 = 120$) and elbow link ($a_3 = 100$) for position $(r, z_{adj})$ where $r = \sqrt{x^2 + y^2}$.
2. **Numerical Damped Least Squares (DLS) / CCD Fallback (Full 5-DOF)**:
   - Computes Jacobian matrix $J(\theta)$
   - $\Delta\theta = J^T (J J^T + \lambda^2 I)^{-1} e$
   - Iterative convergence with step limit and joint limit clamping per step.
