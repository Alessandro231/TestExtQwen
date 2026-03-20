# Diseño: Sistema de Arco y Flechas

**Fecha:** 2026-03-20
**Tipo:** Nueva mecánica de combate (arma a distancia)

---

## 1. Resumen

Agregar un sistema de arco y flechas como arma secundaria al sistema de combate existente. Permite ataques a distancia con munición física recolectable.

---

## 2. Items de Arco

- **Icono**: Arco pixelado flotante (similar a la espada)
- **Obtención**: Bloques ? (mismo sistema que espada)
- **Spawn**: Aparece flotando sobre el bloque golpeado
- **Duración**: 15 segundos (temporizado, como la espada)
- **Recolección**: Colisión del jugador con el item

---

## 3. Mecánica de Disparo

- **Teclas**: C (disparar) o click derecho
- **Dirección**:
  - Izquierda/Derecha según orientación del jugador
  - ↑ + C = disparo hacia arriba (ángulo 45°)
- **Velocidad proyectil**: 12px/frame
- **Alcance máximo**: 400px horizontal, luego desaparece
- **Colisión**: Se clava en plataformas por 3 segundos, luego desaparece

---

## 4. Sistema de Munición

- **Capacidad máxima**: 20 flechas
- **Inicio**: 0 flechas (recibe 10 al recoger arco)
- **Items de recarga**: "F" (flechas), aparecen en cofres secretos o caen de enemigos
- **Cantidad por item**: +10 flechas

---

## 5. Enemigos y Daño

- **Daño**: 1 hit = enemigo muerto
- **Puntuación**: +150 puntos por kill con arco
- **Flecha se clava**: En plataformas enemy's 3 segundos, luego desaparece

---

## 6. UI

- **Indicador de munición**: `🏹 15/20` al lado del contador de dash
- **Barra de tiempo**: Igual que espada (temporizador decreciente)

---

## 7. Coexistencia

- **Espada y Arco**: Son mutuamente excluyentes
- Al recoger arco, se pierde la espada (y viceversa)
- Ambos tienen temporizador independiente

---

## 8. Cambios en niveles

- Agregar 1-2 bloques ? adicionales por nivel para dar opciones
- Items de flechas (F) en ubicaciones estratégicas

---

## 9. Archivos a modificar

- `src/App.jsx`: Renderizado de arco, proyectiles, UI
- `src/levels.js`: Agregar bloques ? y items de flechas