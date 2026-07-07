# Geomechanical Simulation Sandbox for Spatial Vibration Mechanics II

This repository hosts the supplementary interactive simulation sandbox for **"Mechanics of Spatial Vibration II: Interaction between Macroscopic Gravitational Field and Microscopic Spatial Vibration, and Unified Dark Fluid Model" (Version 9)**.

The simulator serves as a computational proof of the chameleon state-equation transition, tensor condensation, and achromatic geodesic lensing claims made in the paper.

## Mathematical Mapping & Features

The simulation sandbox consists of three main panels, each mapping directly to mathematical sections of the manuscript:

1. **Galaxy Rotation Curves & Tensor Condensation (Section 3):**
   Visualizes the flat galactic rotation curve resulting from the additional effective mass $M_{\mathrm{eff}}(r)$ induced by the space vibration tensor $\tilde{V}_{\mu\nu}$ in the low-density halo:
   $$M_{\mathrm{eff}}(r) = M_{\mathrm{visible}}(r) + \frac{4\pi}{c^2} \int_{0}^{r} \langle \tilde{V}_{00} \rangle \sqrt{g_{rr}} \, r'^2 dr'$$
   The simulator renders a golden glowing **Tensor Condensation Halo** showing the spatial distribution of dark matter emerging from wave interference.

2. **Chameleon Vacuum Pressure & S-Curve Transition (Section 3):**
   Demonstrates how the effective state equation $w = p_{vib} / (\rho_{vib} c^2)$ transitions continuously based on the local matter density $\rho_m$:
   $$w(\rho_m) \approx -1 + \frac{1}{1 + e^{-(\rho_m - \rho_{\mathrm{crit}})/\sigma}}$$
   Adjusting the density slider dynamically transitions the system between a matter-like tensor condensation ($w \to 0$ in galaxies) and vacuum tension driving cosmic expansion ($w \to -1$ in voids).

3. **Stochastic Geodesic Lensing & Achromatic Blurring (Section 2):**
   Renders a 3D-warped gravitational space grid experiencing high-frequency microscopic metric perturbations $h_{\mu\nu}^{vib}$.
   - **RGB Photon Triplet Bundles:** Demonstrates the **Achromatic Blurring** effect where photons of different wavelengths (Red, Green, Blue) follow the *exact same* fluctuating path since space perturbations are purely geometric and independent of energy.
   - **Spatial Junction & Negative Pressure:** Shows the time-leap geodesic shortcut stabilized by negative pressure ($p_{vib} < 0$).

## Citing this Work

If you find this simulation sandbox useful in your research, please cite it using the following format:
```bibtex
@software{yoo2026spatial_vibration_sim_2,
  author       = {Yoo, Kwang yong},
  title        = {Geomechanical Simulation Sandbox for Spatial Vibration Mechanics II},
  month        = jul,
  year         = 2026,
  publisher    = {Zenodo},
  version      = {v1.0},
  url          = {https://github.com/khanyong/spatial-vibration-series-2}
}
```
