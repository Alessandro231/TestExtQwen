# Diseno: Checkpoints con Respawn Automatico

**Fecha:** 2026-03-21  
**Tipo:** Nueva mecanica de progreso y supervivencia

## Objetivo
Agregar checkpoints automaticos por nivel para reducir frustracion al morir y mejorar el flujo de avance.

## Reglas funcionales
- Activacion: automatica al tocar una bandera de checkpoint.
- Respawn: al perder una vida, el jugador reaparece en el ultimo checkpoint activado.
- Persistencia: el checkpoint activo se mantiene durante todo el nivel actual.
- Reinicio: al cambiar de nivel, los checkpoints se reinician.

## Integracion tecnica
- `src/levels.js`: define `checkpoints` por nivel con `id`, `label`, `x`, `y` y `respawn`.
- `src/checkpoints.js`: encapsula creacion, activacion por colision y resolucion del punto de respawn.
- `src/App.jsx`:
  - carga checkpoints al inicializar nivel,
  - activa checkpoint al contacto durante el loop de juego,
  - usa el respawn del checkpoint activo al aplicar dano letal,
  - dibuja banderas y muestra HUD/aviso de checkpoint.

## UX
- HUD compacto: estado de checkpoint (`label` y progreso `activo/total`).
- Aviso temporal al activar checkpoint.
- Indicador visual en mundo: bandera con brillo cuando esta activa.

## Fuera de alcance
- Guardado persistente entre sesiones.
- Teletransporte manual entre checkpoints.
- Activacion manual con tecla.
