# ADENDA: INTEGRACIÓN CON OPENCODE PARA VIBE CODING
# Complementa a PROMPT_MAESTRO_TELEGRAM_CONTROL.md y al plan de implementación ya generado

Esta adenda corrige y extiende la sección `ai_engine.py` del plan. El resto del sistema
(executor.py, sanitizer.py, capas de seguridad A–I) se mantiene sin cambios y sigue gobernando
los comandos de shell que vos tipeás directamente. Lo que cambia es cómo el bot habla con
opencode.

---

## 1. CORRECCIÓN ARQUITECTÓNICA CLAVE

`opencode` **no es un chat que devuelve bloques de código para ejecutar** — es un agente que ya
tiene sus propias tools (`edit`, `bash`, `write`, `patch`) y las ejecuta él mismo, dentro del
directorio de proyecto que se le indique. El diseño anterior (parsear ` ```powershell ` de la
respuesta y pasarlo a `executor.py`) no aplica acá: hay que dejar que opencode edite y corra
comandos con su propio motor, y lo que hace el bot es **orquestar la sesión y mostrarte el
resultado**, no interceptar su salida como si fuera texto plano.

Separación de responsabilidades, de ahora en más:
- **Canal de shell directo** (`executor.py`, ya construido): para comandos que vos tipeás a mano
  desde Telegram. Sigue con las 9 capas tal cual están.
- **Canal de vibe coding** (`ai_engine.py`, esta adenda): para pedirle a opencode que programe.
  No pasa por `executor.py` — pasa por el propio sandbox de opencode, configurado en
  `opencode.json`.

---

## 2. SERVIDOR PERSISTENTE (`opencode serve`)

En vez de invocar `opencode run "..."` desde cero en cada mensaje (cold start + pérdida de
contexto), el bot debe:

1. Al arrancar, lanzar `opencode serve --hostname 127.0.0.1 --port 4096` como subproceso en
   background (si no hay ya uno corriendo), **atado solo a localhost** — nunca `0.0.0.0`.
2. Setear `OPENCODE_SERVER_PASSWORD` en `.env` y pasarlo como variable de entorno al subproceso,
   para que el servidor exija basic auth incluso siendo local.
3. Cada invocación posterior usa `opencode run --attach http://127.0.0.1:4096 ...`, evitando el
   cold-start de los MCP servers en cada mensaje.
4. Si el subproceso del servidor muere, `bot.py` lo reinicia y avisa por la Capa I (notificación
   de arranque/caída), igual que hace con el bot mismo.

## 3. SESIONES POR PROYECTO

- `session_manager.py` mantiene un mapa `project_dir → opencode_session_id`, persistido en un
  JSON chico en `logs/opencode_sessions.json` (no solo en memoria: si el bot se reinicia, no
  querés perder el hilo de la sesión de opencode).
- Al hacer `/cd <proyecto>`, el bot busca si ya existe sesión para ese directorio; si no, la crea
  (`opencode session create` o, más simple, el primer `run` en ese `--path` genera una y se
  guarda el `session_id` devuelto).
- `/reset` ya no solo limpia `conversation_history` en memoria: además hace
  `opencode run --fork` (o crea sesión nueva) para el proyecto activo, dejando la sesión vieja
  archivable si después querés retomarla.

## 4. COMANDOS NUEVOS DEL BOT

| Comando | Qué hace |
|---|---|
| `/plan <mensaje>` | `opencode run --agent plan --attach ... --session <id> "<mensaje>"` — solo análisis, no toca archivos. Para pensar el approach antes de tocar código. |
| `/code <mensaje>` (o el mensaje libre, default) | `opencode run --agent build --attach ... --session <id> --format json "<mensaje>"` — implementa, con escritura de archivos habilitada. |
| `/tests` | Corre el comando de test configurado por proyecto (`TEST_COMMAND` en `.env` o en un archivito `project.json` dentro de cada proyecto) y devuelve pass/fail + salida resumida. |
| `/diff` | `git diff --stat` + `git diff` (chunked) del proyecto activo — para revisar qué tocó opencode sin tener que preguntar. |
| `/undo` | `git stash` o `git checkout -- .` sobre el proyecto activo — **siempre con confirmación (Capa D)**, es el botón de pánico. |
| `/attach <ruta> <mensaje>` | Adjunta un archivo del proyecto (o algo subido por Telegram, guardado en `inbox/`) al mensaje vía `--file`, útil para mandarle un log de error o una captura desde el celular. |

El loop recomendado para vibe coding real es el mismo que documenta el propio ecosistema de
opencode: **plan → implement → verificar con tests → si falla, reintentar → finalizar**. Con
`/plan`, `/code`, `/tests` y `/diff` como los cuatro botones de ese loop, calza natural desde el
celular.

## 5. PERMISOS: `opencode.json`, NO `--dangerously-skip-permissions` A CIEGAS

En modo no-interactivo, cualquier permiso configurado como `"ask"` **cuelga o cancela la
ejecución** porque no hay nadie del otro lado para responder el prompt (comportamiento
documentado del CLI). La solución no es tirar `--dangerously-skip-permissions` global y cruzar
los dedos — es configurar `opencode.json` en la raíz de cada proyecto con reglas explícitas de
`allow`/`deny`, sin usar `"ask"` en absoluto para el perfil que dispara el bot:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "edit": "allow",
    "external_directory": "deny",
    "read": {
      "*": "allow",
      "*.env": "deny",
      "*.env.*": "deny"
    },
    "bash": {
      "*": "deny",
      "git status*": "allow",
      "git diff*": "allow",
      "git log*": "allow",
      "git add*": "allow",
      "git commit*": "allow",
      "npm *": "allow",
      "pnpm *": "allow",
      "yarn *": "allow",
      "python *": "allow",
      "pytest*": "allow",
      "rm *": "deny",
      "Remove-Item*": "deny",
      "format*": "deny",
      "git push --force*": "deny",
      "git push*": "deny"
    },
    "webfetch": "deny"
  }
}
```

Notar el paralelismo deliberado con la lista negra de `executor.py` (Capa B): las mismas
categorías destructivas quedan bloqueadas acá también, como defensa en profundidad — si algún
día opencode tiene un bug que ignora una regla, la otra capa (git como red de seguridad + revisión
de diff) sigue ahí. `git push` queda en `deny` a propósito: que opencode commitee libremente
dentro del sandbox está bien, pero el push a un remoto lo hacés vos a mano o vía `/git push` con
confirmación explícita del lado del bot.

Si en la práctica con la versión instalada de opencode alguna escritura sigue sin aplicarse pese
a `edit: allow` (hay un issue conocido de este tipo en versiones anteriores), recién ahí evaluar
`--dangerously-skip-permissions` como último recurso — y agregarlo al checklist de QA como caso
a probar explícitamente, no asumir que hace falta de entrada.

## 6. STREAMING DE PROGRESO

Usar `--format json` en cada `opencode run` y parsear el stream de eventos para ir editando el
mensaje de Telegram cada ~2-3 segundos (nunca más rápido: Telegram limita ediciones por chat) con
algo tipo:
```
🔧 Editando src/api.ts...
🔧 Corriendo npm test...
```
en vez de quedarte con la pantalla muda esperando una respuesta que puede tardar más de un
minuto. Es la mejora de UX más importante para que esto se sienta como "vibe coding" y no como
mandar un comando a un buzón.

## 7. CAMBIOS A `.env` / `config.py`

Agregar:
```
OPENCODE_SERVER_HOST=127.0.0.1
OPENCODE_SERVER_PORT=4096
OPENCODE_SERVER_PASSWORD=
TEST_COMMAND=
```
`config.py` valida que si `AI_BACKEND=opencode` (ya es el default), `OPENCODE_CLI_PATH` exista en
disco antes de arrancar — igual que ya valida `ALLOWED_PROJECT_DIRS`.

## 8. AGREGAR AL CHECKLIST DE QA (sección 6 del plan original)

9. Con `opencode.json` en un proyecto de prueba, correr `/code "crea un archivo test.txt con la
   fecha de hoy"` y confirmar que el archivo se crea realmente (verifica que `edit: allow`
   funciona en modo headless con la versión instalada).
10. Correr `/code "borrá todo el contenido de la carpeta"` (en un proyecto de prueba
    descartable) y confirmar que la regla `bash.deny` bloquea el intento, no solo lo registra.
11. Matar el proceso de `opencode serve` a mano y confirmar que el bot lo detecta y lo reinicia
    solo, avisando por Telegram.
12. Reiniciar el bot y confirmar que `/code` en un proyecto ya usado retoma la sesión anterior
    (lee `logs/opencode_sessions.json`) en vez de arrancar una conversación nueva sin contexto.
