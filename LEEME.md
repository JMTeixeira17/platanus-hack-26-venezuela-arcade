# Moto Piruetas: Hora Pico en la Fajardo

Juego para el Arcade Challenge de Platanus Hack 26 Caracas. Un jugador, Phaser 3, todo dibujado y sonado con código.

- `game.js`: 49.7 KB minificado (el límite es 50 KB). Pasa `npm run check-restrictions`.
- `metadata.json`: nombre, descripción y `single_player`.
- `cover.png`: 800x600, pixel art hecho con los sprites y la fuente del juego. Se regenera con `node tools/make-cover.mjs` (necesita Google Chrome instalado).

El resto de los archivos son los del repo oficial de inicio, sin cambios.

## Probarlo en tu máquina

```bash
npm install
npm run dev
```

Abre `localhost:3001`. El panel de desarrollo muestra el juego y revisa las restricciones en vivo.

## Enviarlo

1. Haz fork de `platanus-hack/platanus-hack-26-venezuela-arcade` en GitHub.
2. Reemplaza `game.js`, `metadata.json` y `cover.png` con los de esta carpeta.
3. Haz commit y push.
4. Usa el botón **Submit** del panel de desarrollo.

Fecha límite: 21 de octubre de 2026, 23:59 hora de Caracas.

## Controles

| Máquina | Teclado (pruebas) | Acción |
|---|---|---|
| Joystick arriba / abajo | W / S | Cambiar de carril |
| Frenando, arriba / abajo desde un canalito | A + W / S | Colarse por un carril trancado |
| Joystick derecha / izquierda | D / A | Acelerar / frenar |
| Botón 1 (mantener) | U | Caballito |
| Botón 2 | I | Corneta |
| En el aire: izquierda / derecha | A / D | Girar (hay que caer derecho) |
| Start | Enter | Empezar |

Funciona con cualquiera de los dos joysticks de la máquina. No se tocó `CABINET_KEYS`.

En el teléfono salen controles táctiles: joystick a la izquierda, botones 1 y 2 a la derecha y, fuera de la partida, START arriba a la derecha.

## Qué hay en el juego

- **Meta:** es de noche y hay que buscar a la chamita para irse a rumbear. 5 motorizados con velocidad, manejo, equilibrio y un especial propio. Hay que ir de Petare a la casa de la chamita antes de que se acabe el tiempo; cada tramo suma segundos. Si llegas a tiempo, ella te espera en la acera celebrando y empieza la noche siguiente, con más tráfico y menos tiempo. Si no, Wilkerson se la lleva.
- **La Fajardo de noche:** cielo con estrellas y luna llena, el Ávila en sombra con las luces de los barrios, edificios con ventanas encendidas y vallas iluminadas.
- **Puntos:** rasantes en combo (con insultos), caballito, piruetas desde las grúas, empanadas.
- **Peligros:** alcantarillas con rama que solo pasas en caballito, camioneticas que frenan con "¡PARADA!", baches, motorizados que te empujan tocando corneta, el hombrillo que te tira al Guaire, colas con vendedores que no puedes chocar y el fiscal, que aparece cuando se llena la sirena. Se le escapa saltando desde una grúa, dejándole un carro en medio o aguantando 9 segundos hasta que se cansa.
- **Power-ups:** estampita de José Gregorio (invencible, y se aparece a bendecirte con música de iglesia), Anís Cartujo (turbo, pero curdo), guayoyo (+5 segundos), casco (aguanta un choque) y empanada.
- **Récords:** ranking de 5 con iniciales, guardado con `platanusArcadeStorage`.
- **Pantalla de título:** fija, sobre un cielo de noche (degradado azul de #000628 a #011469 con estrellas, igual que la selección de piloto), con el motorizado en caballito con la botella de anís al centro, los controles (WASD, J, K) a los lados y el guiño a Platanus Hack abajo. El ranking se ve al terminar la partida.
- **Intro:** antes de cada partida sale PLATANUS HACK 2026 CARACAS con la bandera de Venezuela (unos 2,5 segundos; START o botón 1 la saltan).

## Ajustes rápidos en `game.js`

- `TRIP`: largo del recorrido en píxeles (7200).
- Tiempo inicial: `time: day > 1 ? 30 : 34` en `newRun`.
- Segundos por tramo: `S.time += 12`.
- Frecuencia de eventos: el objeto `S.nx` y la función `director`.
- Fiscal: ventaja de velocidad `m.v + 21` y se cansa con `c.t > 9`.
