# Reál Matrix - Matrix Multiplication on Multiple GPUs

![CUDA](https://img.shields.io/badge/CUDA-76B900?style=flat&logo=nvidia&logoColor=white)
![C++](https://img.shields.io/badge/C%2B%2B-00599C?style=flat&logo=cplusplus&logoColor=white)

Portfolio write-up of my CS217/EE217 (GPU Architecture and Parallel Programming, Fall 2022, UC Riverside) capstone project — scaling tiled matrix multiplication across 4 GPUs using CUDA streams and Unified Memory.

**[→ View the live site](https://rugvedb133.github.io/gpu-ninja/)**

![Site preview](/../gh-pages/assets/og-image.png)

## Overview

- **What**: single-GPU tiled matrix multiplication, scaled out to run across four GPUs at once instead of one.
- **Hardware**: UCR's "Bender" server, with dual Xeon 4214 CPUs, 256GB RAM, 4× NVIDIA RTX 2070 (8GB each).
- **Approach**: matrix A split into row-blocks, matrix B into column-blocks, producing four independent sub-multiplications; one dispatched per GPU via `cudaSetDevice()`, coordinated with per-device CUDA streams, backed by Unified Memory (`cudaMallocManaged`) instead of explicit host/device copies.
- **Result**: kernel execution dropped from 0.004720s to 0.000048s (~98×) at the default 1000×1000 size, offset in part by real coordination overhead in standing up four streams and device contexts.
- **Limitation**: square matrices only, by deadline rather than design.

## Branches

- **[`main`](../../tree/main)** (this branch) — documentation only. The original coursework was developed and submitted through GitHub Classroom, so the source code itself isn't included here.
- **[`gh-pages`](../../tree/gh-pages)** — the live site (plain HTML/CSS/JS, no build step).

## About the site

Built as a single static page, deliberately low on dependencies: 
semantic HTML (no div-soup), 
`prefers-reduced-motion` respected wherever there's animation, 
and text content kept in separate files fetched at runtime rather than inlined into the markup.