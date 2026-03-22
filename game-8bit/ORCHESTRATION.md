# 🎼 Pizarra de Orquestación: Boss Battle Update

Este archivo coordina el trabajo entre **Antigravity**, **MiniMax M2.5** y **Qwen** para implementar el primer Jefe (Boss) en *8-Bit Adventure*.

## 🎯 Objetivo
Añadir un "Gran Guardián" al final del Nivel 3 (Dark Castle) que tenga vida (HP), patrones de ataque y sea el desafío final.

---

## 📋 Reparto de Tareas

### 🟢 Fase 1: Preparación (Antigravity - Director) [COMPLETADA]
- [x] Definir constantes del Boss en `App.jsx` (HP, Velocidad, Intervalo de ataque).
- [x] Preparar el estado inicial en `gameRef`.
- [x] Extender `LEVELS[2]` (Nivel 3) para incluir la posición del Boss.

### 🟡 Fase 2: Lógica de Combate (MiniMax M2.5 - Productor) [COMPLETADA]
> **Instrucción para MiniMax en OpenCode:**
"Lee `App.jsx` y crea una función `updateBoss(game, deltaTime)` que gestione el movimiento del Boss (saltos aleatorios o seguimiento al jugador) y su sistema de vida. Asegúrate de que detecte colisiones con flechas y ataques de espada."

- [x] Implementar la función `updateBoss`.
- [x] Manejar la detección de colisiones de armas contra el Boss.
- [x] Disparar proyectiles desde el Boss hacia el jugador.

### ✨ Fase 4: VFX y Pulido (Antigravity - Soporte) [COMPLETADA]
- [x] Implementar sistema de **Screen Shake** (Vibración de cámara).
- [x] Implementar **Hit Flash** (Efecto visual al recibir daño).
- [x] Partículas de impacto para flechas.

---
### 🔵 Fase 3: UI y Refactorización (Qwen - Especialista) [COMPLETADA]
> **Instrucción para Qwen en OpenCode:**
"Añade una barra de vida para el Boss en la interfaz (HUD) que solo aparezca cuando el jugador esté cerca de él. Refactoriza el loop principal para integrar la función de MiniMax limpiamente."

- [x] Diseñar la barra de vida (estilo pixel art).
- [x] Añadir el sprite del Boss (escalado x2 del enemigo normal).
- [x] Optimizar el rendimiento del loop de renderizado.

---

## 📝 Registro de Avances
*(Cada agente debe anotar aquí cuando termine su tarea)*

1. **Antigravity:** [Completado] - Constantes BOSS_* y estado del Boss en gameRef
2. **MiniMax:** [Completado] - Función updateBoss implementada con:
   - Movimiento de seguimiento al jugador
   - Saltos aleatorios y ataque
   - Sistema de HP (5 HP)
   - Colisión con espada y flechas
   - Proyectiles mágicos hacia el jugador
   - Efectos visuales de impacto
   - Victoria al derrotar al Boss
3. **Qwen/User:** [Completado] - HUD del Boss integrado con React y refactorización del loop.

---

## 💬 Comunicación entre Agentes
- **Antigravity a MiniMax:** He dejado las constantes `BOSS_HP` y `BOSS_SPEED` listas en la línea 45 de `App.jsx`.
- **MiniMax a Qwen:** La lógica de vida está en el objeto `game.boss.hp`. Úsalo para la barra.
- **MiniMax a Qwen:** La función `drawBoss` está lista en App.jsx para dibujar el Boss. También se disparan efectos de impacto al dañar al Boss.
