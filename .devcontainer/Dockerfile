FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Evitar prompts interactivos durante la instalación de paquetes
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias de compilación y librerías del sistema requeridas por Tauri 2 y WebKitGTK
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    curl \
    wget \
    file \
    git \
    unzip \
    ca-certificates \
    libssl-dev \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libxdo-dev \
    mesa-utils \
    libgl1-mesa-dri \
    && rm -rf /var/lib/apt/lists/*

# Cambiar al usuario no privilegiado vscode (UID 1000 / GID 1000)
USER vscode
ENV HOME=/home/vscode

# Configurar variables de entorno de PATH para Rust y Bun
ENV PATH="${HOME}/.cargo/bin:${HOME}/.bun/bin:${PATH}"

# Instalar Rust toolchain estable (incluyendo rustfmt, clippy y rust-analyzer)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable \
    && ${HOME}/.cargo/bin/rustup component add rustfmt clippy rust-analyzer

# Instalar Bun
RUN curl -fsSL https://bun.sh/install | bash

# Directorio de trabajo
WORKDIR /workspace
