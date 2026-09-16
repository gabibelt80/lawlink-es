# MAPA MAESTRO DE IMPLEMENTACIÓN — LAWLINK / JURIDICTAS
Versión: 0.2.0
Estado: PLANIFICACIÓN — NO IMPLEMENTAR AÚN
Fecha: 2026-09-16
Última revisión: cierre del Chat #2
Próxima revisión: al cerrar Módulo 3 (auditoría)

═══════════════════════════════════════════════════════════════════
REGLA 0 — CÓMO USAR ESTE DOCUMENTO
═══════════════════════════════════════════════════════════════════

- Este MD es la ÚNICA fuente de verdad del proyecto.
- Se pega al inicio de CADA chat nuevo antes de pedir cualquier cosa.
- La IA debe leerlo completo antes de responder.
- Al final de cada chat, la IA devuelve el MD actualizado.
- NUNCA se implementa nada que no esté aprobado acá.
- NUNCA se modifica producción sin autorización explícita.
- Los cambios se versionan: v0.1 → v0.2 → ... nunca se sobreescribe.
- Si un chat se desvía, se cierra y se abre otro con este MD como ancla.

═══════════════════════════════════════════════════════════════════
SECCIÓN 1 — SISTEMA ACTUAL (foto real, sin suposiciones)
═══════════════════════════════════════════════════════════════════

1.1 IDENTIDAD
- Nombre: LawLink (carpeta) / Juridictas (DB y usuario del sistema)
- Ubicación server: /opt/juridictas/lawlink/
- Host server: macserver-M (Ubuntu 24.04)
- Acceso server: Tailscale 100.104.10.13
- Disco server: 879G total, 768G libres
- Repo remoto: https://github.com/gabibelt80/lawlink-es.git
- Ubicación PC desarrollo: C:\Users\Gbelt\juridictas\lawlink (Windows)

1.2 STACK TÉCNICO CONFIRMADO
- Runtime: Node.js v22.23.2
- Framework: Next.js 16.2.7 (App Router)
- Lenguaje: TypeScript 5.7.2
- ORM: Prisma 5.22.0
- DB: PostgreSQL 16.15 (locale es_AR.UTF-8)
- Editor documentos: Tiptap 3.x + LibreOffice 24.2.7.2 (headless)
- Auth: NextAuth 4.24 + Prisma Adapter
- UI: Radix UI + TailwindCSS 3.4 + Recharts + Framer Motion
- Documentos: docx 9.7 + docxtemplater 3.68 + mammoth + html-to-docx
- PDFs: pdfjs-dist + unpdf
- OCR: tesseract.js
- Excel: exceljs
- IA: cliente custom en src/lib/ai/client.ts (proveedor NO CONFIRMADO)
- i18n: i18next + tacotranslate (herencia china, a revisar)
- Pagos: Mercado Pago
- Monitoreo: Netdata
- Proceso: PM2 (proceso "lawlink", fork mode, online)
- Docker: circulo_app (puerto 3002), circulo_db (postgres-alpine)

1.3 ESTRUCTURA DE CARPETAS (nivel 2)
/opt/juridictas/lawlink/
  ├── src/
  │   ├── app/
  │   │   ├── (app)/          ← App autenticada
  │   │   │   ├── agents/      ← Panel agentes IA
  │   │   │   │   └── jurisprudence/ ← ⚠️ YA EXISTE
  │   │   │   ├── admin/       ← Super admin
  │   │   │   └── settings/ai/ ← Config IA por estudio
  │   │   └── (legal)/         ← Términos y privacidad
  │   ├── server/
  │   │   ├── admin/
  │   │   ├── ai/              ← 17 archivos lógica IA
  │   │   ├── settings/
  │   │   └── yuandian/        ← ⚠️ A ELIMINAR
  │   ├── lib/
  │   │   ├── ai/              ← client.ts + settings.ts
  │   │   └── yuandian/        ← ⚠️ A ELIMINAR
  │   └── scripts/
  ├── prisma/
  │   └── schema.prisma        ← 58 modelos
  ├── storage/
  │   ├── matters/             ← carpetas por caso
  │   ├── templates/
  │   └── m_[cuid]/            ← archivos por caso
  ├── escritos/                ← 100+ plantillas .txt
  ├── escritos-pdf/
  ├── escritos-viejos/
  ├── docs/                    ← documentación
  │   └── PLAN.md              ← este documento
  ├── public/
  ├── scripts/
  ├── ecosystem.config.js      ← config PM2
  └── backups/

1.4 BASE DE DATOS
- PostgreSQL 16.15 local
- DB principal: `juridictas`
- DB del estudio actual: `juridictas_juridictas`
- Modelo multi-tenant: DB por estudio
  (Firm + FirmUser en DB principal, operativas en DB por estudio)
- 58 tablas totales
- Tamaño actual: 22 MB
- Extensiones: solo plpgsql (⚠️ NO tiene pgvector)

1.5 AGENTES IA ACTUALES
Ubicación: src/server/ai/
- case-chat.ts              ← chat sobre un caso
- document-chat.ts          ← chat sobre un documento
- draft-document.ts         ← redacción de escritos
- review-document.ts        ← revisión IA de documentos
- batch-review-matter.ts    ← revisión por lote
- matter-review-summary.ts  ← resumen de caso
- recommend-cause.ts        ← sugerencia de causa
- parse-summons.ts          ← parseo de cédulas
- parse-pleading.ts         ← parseo de escritos
- parse-express.ts          ← parseo de envíos
- review-history.ts         ← historial de revisiones
- save-review.ts            ← guardar resultado
- actions.ts                ← acciones generales

Configuración: src/lib/ai/client.ts + settings.ts
Config UI: src/app/(app)/settings/ai/  ← POR ESTUDIO
Proveedor: NO CONFIRMADO (revisar client.ts)

1.6 FLUJO DE PROCESAMIENTO DE DOCUMENTOS (INTOCABLE)

1.6.1 Documentos de caso — code.json
- Cada Matter genera carpeta: storage/matters/[CODE]/
- Dentro hay un code.json con TODO lo del caso
- Ese JSON es la fuente de verdad para los agentes IA
- Los agentes (Editor, Auditor) leen de ahí
- El cliente NO ve esto
- ⚠️ INTOCABLE. NO MODIFICAR SU ESTRUCTURA BASE.

1.6.2 Documentos Word / escritos — pipeline txt
- Se suben .docx o .txt
- El sistema convierte a texto plano
- La IA opera sobre texto plano
- LibreOffice headless regenera .docx
- Visualmente se ve Word, se descarga Word
- ⚠️ INTOCABLE. JAMÁS TOCAR. Es la base operativa del sistema.

1.6.3 Implicancia para jurisprudencia
- La jurisprudencia nueva DEBE respetar estos flujos:
  · Si se asocia a un caso → se agrega al code.json (con cuidado)
  · Si es documentación general → usa pipeline de documentos
- NO inventar flujos paralelos de datos.

1.7 CÓMO CORRE EL SERVER
- Proceso: PM2 (`pm2 list` muestra "lawlink" online, id 0)
- Modo: fork (NO cluster)
- Restarts: 50 (⚠️ revisar por qué tantos)
- Memoria: ~200 MB
- Puerto principal: 3000 (next-server v16)
- Puerto secundario: 3002 (docker-proxy, circulo_app)
- Deploy: ecosystem.config.js
- Watch: PM2 "watching: disabled" ✅
- ⚠️ HALLAZGO: `node --watch src/server.js` como root (pid 42968) — verificar

1.8 VARIABLES DE ENTORNO (solo nombres)
NEXTAUTH_SECRET, NEXTAUTH_URL
APP_STORAGE_DIR, STORAGE_ENCRYPTION_KEY
NEXT_PUBLIC_TACOTRANSLATE_PUBLIC_API_KEY, TACOTRANSLATE_SECRET_API_KEY
NEXT_PUBLIC_TACOTRANSLATE_DEFAULT_LOCALE, NEXT_PUBLIC_TACOTRANSLATE_ORIGIN
NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY
MERCADO_PAGO_ACCESS_TOKEN, MERCADO_PAGO_PUBLIC_KEY
MERCADO_PAGO_CLIENT_ID, MERCADO_PAGO_CLIENT_SECRET

⚠️ NO hay OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY ni OLLAMA_URL
   → El proveedor IA debe estar guardado en DB (SystemSetting)
   → CONFIRMAR en src/lib/ai/client.ts y src/lib/ai/settings.ts

1.9 PROVEEDOR IA DEL SISTEMA
- Protocolo: OpenAI-compatible ({baseUrl}/chat/completions)
- Proveedor por defecto: Qwen (Alibaba Cloud) — se puede cambiar
- Config: tabla SystemSetting, clave "aiSettings", JSON cifrado
- Campos guardados: apiKeyCipher, baseUrl, textModel, visionModel
- API key: cifrada con STORAGE_ENCRYPTION_KEY (AES-256-GCM)
- Modelo default texto: gpt-4o-mini
- Modelo default vision: gpt-4o
- Cliente: src/lib/ai/client.ts (funciones aiChat, aiVision, extractJson)
- Config lectura/escritura: src/lib/ai/settings.ts
- Cualquier proveedor compatible OpenAI sirve: OpenAI, DeepSeek, Kimi,
  Zhipu, OpenRouter, Ollama, Qwen, etc.

1.10 UI JURISPRUDENCE EXISTENTE (auditoría Chat #3)
- page.tsx: carga constantes y renderiza la vista
- jurisprudence-agents-view.tsx: UI completa con:
  · Lista de 4 fuentes (SAIJ, CIJ, PJN, Fallos CSJN)
  · Lista de 3 agentes predefinidos:
    - civil_casacion (Camara Civil CABA)
    - laboral_riesgos (CNAT)
    - penal_garantias (CNCP)
  · Boton "Ejecutar" por agente
- ⚠️ El boton "Ejecutar" SIMULA con setTimeout(2000). No hace nada real.
- ⚠️ NO hay server action, scraper, ni persistencia asociada.
- Definiciones de fuentes y agentes: src/lib/ai-jurisprudence-agents.ts
- Estado real: UI LISTA, BACKEND FALTA.

═══════════════════════════════════════════════════════════════════
SECCIÓN 2 — QUÉ SE QUIERE AGREGAR (alcance)
═══════════════════════════════════════════════════════════════════

2.1 MÓDULO JURISPRUDENCIA (modificar lo existente, no crear)

2.1.1 Estado actual (a verificar en Módulo 3)
- Modelo `Jurisprudence` YA EXISTE en schema.prisma
- UI `src/app/(app)/agents/jurisprudence/` YA EXISTE
- NO SE CREA DESDE CERO. SE MODIFICA Y SE COMPLETA.

2.1.2 Objetivo real
- Hacer que la jurisprudencia EXISTENTE funcione de verdad
- Agregar lo que le falta (ingesta, procesamiento, búsqueda)
- Integrarla con el flujo actual (code.json + documentos)
- NO rediseñar. NO reemplazar. COMPLETAR.

2.1.3 Lo que hay que averiguar antes de tocar nada
- ¿Qué campos del modelo Jurisprudence se usan hoy?
- ¿Qué hace exactamente jurisprudence-agents-view.tsx?
- ¿Hay datos cargados o está vacío?
- ¿Está conectado al sistema de módulos por estudio?
- ¿Está en el sidebar del dashboard?

2.2 BIBLIOTECA UNIFICADA
- Documentos propios del estudio (ya existen: FirmFile, WritingTemplate)
- Documentos descargados (nuevo)
- Documentos en procesamiento (nuevo)
- Todo bajo el mismo pipeline de conversión existente

2.3 FUERA DE ALCANCE (explícito)
- NO tocar producción hasta que Fase 0 esté validada
- NO modificar modelo de datos existente sin migración controlada
- NO romper el pipeline actual de escritos
- NO tocar la DB principal (solo la DB del estudio)
- NO reescribir el schema Prisma existente
- NO tocar code.json sin autorización explícita

═══════════════════════════════════════════════════════════════════
SECCIÓN 3 — ARQUITECTURA PROPUESTA (conceptual)
═══════════════════════════════════════════════════════════════════

3.1 PRINCIPIO RECTOR (4 reglas)

REGLA 1: NO TOCAR lo que funciona
- code.json por caso → INTOCABLE
- Flujo Word → txt → Word → INTOCABLE
- Agentes Editor y Auditor existentes → INTOCABLES en su lógica base
- Multi-tenant por DB → INTOCABLE

REGLA 2: COMPLETAR lo que existe a medias
- Jurisprudence ya existe → completar, no crear
- agents/jurisprudence/ ya existe → completar, no crear
- FirmFile ya existe → extender, no duplicar

REGLA 3: AGREGAR sin romper
- Nuevas tablas: solo si no hay equivalente
- Nuevos campos: solo si no rompen queries existentes
- Nuevos componentes: solo si no duplican existentes

REGLA 4: RESPETAR el flujo de datos actual
- Si jurisprudencia se asocia a un caso → va al code.json (con cuidado)
- Si es documentación general → va por pipeline de documentos
- NO crear rutas paralelas de datos

3.2 COMPONENTES NUEVOS
- Ingestor de fuentes (SAIJ, InfoLEG, CSJN, cámaras)
- Procesador de jurisprudencia (reutiliza pipeline)
- Indexador de texto (full-text primero, embeddings después)
- Vinculador causa↔jurisprudencia
- UI de biblioteca (extiende agents/jurisprudence existente)

3.3 INTEGRACIÓN SIN ROMPER
- Prisma migrate dev en LOCAL para campos nuevos
- FirmModuleSubscription para activar/desactivar por estudio
- SystemSetting para configurar fuentes por estudio
- ReviewRecord y Document para trazabilidad

═══════════════════════════════════════════════════════════════════
SECCIÓN 4 — MODELO DE DATOS (cambios propuestos)
═══════════════════════════════════════════════════════════════════

4.1 MODELO Jurisprudence EXISTENTE
Campos actuales:
  id, title, summary, fullText, court, jurisdiction, fuero,
  date, source, sourceUrl, category, tags[], createdById, matterId

A AGREGAR (propuesta, validar en Fase 2):
  - fingerprint String @unique  ← deduplicación
  - hash String                  ← sha256 del contenido
  - pdfPath String?              ← ruta al PDF
  - status String                ← pending/downloaded/processed/error
  - processedAt DateTime?
  - ingestBatchId String?        ← trazabilidad
  - citedInMatters Matter[]      ← relación N:M (si hace falta)

4.2 MODELOS NUEVOS (solo si hacen falta)
- JurisprudenceSource (catálogo de fuentes)
- JurisprudenceRelation (citas entre fallos)
- JurisprudenceMatterLink (vínculo fallo ↔ causa)
- JurisprudenceIngestLog (historial de ingesta)

4.3 MODELO Library EXISTENTE
- FirmFile: archivos del estudio (ya tiene categorías)
- WritingTemplate: plantillas de escritos
- Document: documentos por Matter

A AGREGAR (propuesta):
- LibraryItem (biblioteca unificada):
  - id, type (own/downloaded/processing), sourceUrl, metadata Json
  - Vinculado a FirmFile o Jurisprudence según type

4.4 REGLAS DE DATOS
- IDs: cuid()
- Fechas: DateTime con @default(now())
- Tags: String[]
- Índices: @@index en campos de búsqueda
- No tocar modelos existentes sin migración controlada

═══════════════════════════════════════════════════════════════════
SECCIÓN 5 — MÓDULOS A CONSTRUIR
═══════════════════════════════════════════════════════════════════

Cada módulo se cierra antes de avanzar al siguiente.

MÓDULO 1 — Revisión y limpieza del sistema actual
  Objetivo: eliminar yuandian, MariaDB, procesos auxiliares desconocidos.
  Criterios: cero referencias a yuandian, MariaDB detenido, documentado.
  Dependencias: ninguna.
  Riesgo: bajo (solo en local).

MÓDULO 2 — Preparación del entorno local
  Objetivo: replicar prod en local para trabajar sin riesgo.
  Criterios: DB local clonada, .env.local configurado, PM2 local.
  Dependencias: Módulo 1.
  Riesgo: bajo.

MÓDULO 3 — Auditoría de lo existente (CRÍTICO)
  Objetivo: entender qué hay antes de tocar.
  Tareas:
    a) Leer src/app/(app)/agents/jurisprudence/ completo
    b) Leer jurisprudence-agents-view.tsx completo
    c) Query a DB: SELECT COUNT(*) FROM "Jurisprudence";
    d) Ver si Jurisprudence está en FirmModuleSubscription
    e) Ver si aparece en sidebar del dashboard
    f) Ver cómo se relaciona con code.json (si lo hace)
    g) Confirmar proveedor IA en src/lib/ai/client.ts
    h) Identificar proceso node --watch root
  Criterios: informe escrito de qué existe y qué falta.
  Dependencias: Módulo 2.
  Riesgo: nulo (solo lectura).
  ⚠️ SIN ESTE MÓDULO CERRADO, NO SE AVANZA AL MÓDULO 4.

MÓDULO 4 — Modificación del modelo Jurisprudence
  Objetivo: agregar campos faltantes SIN romper lo existente.
  Tareas:
    a) Definir qué campos agregar (basado en Módulo 3)
    b) Prisma migrate dev en LOCAL
    c) Verificar queries existentes
    d) Verificar UI existente no se rompe
  Criterios: migración aplicada, UI funciona, tests pasan.
  Dependencias: Módulo 3.
  Riesgo: medio (tocar modelo existente).

MÓDULO 5 — Ingestor de fuentes (una sola, la primera)
  Objetivo: bajar fallos de UNA fuente y guardarlos.
  Criterios: descarga, procesa, guarda en DB, guarda PDF.
  Dependencias: Módulo 4.
  Riesgo: medio (depende de la fuente).

MÓDULO 6 — Indexador de jurisprudencia
  Objetivo: búsqueda full-text sobre fullText.
  Criterios: búsqueda funcional en UI, resultados ordenados.
  Dependencias: Módulo 5.
  Riesgo: bajo (PostgreSQL tsvector nativo).

MÓDULO 7 — Biblioteca unificada
  Objetivo: UI que muestre propias + descargadas + en proceso.
  Criterios: panel unificado, filtros, acciones por tipo.
  Dependencias: Módulo 5.
  Riesgo: bajo (solo UI + queries).

MÓDULO 8 — Vinculador causa ↔ jurisprudencia
  Objetivo: asociar fallos a causas automática y manualmente.
  Tareas:
    a) Definir formato de entrada en code.json
    b) Extender lógica de generación de code.json (SIN ROMPER)
    c) Probar con caso de prueba en LOCAL
  Criterios: caso de prueba tiene jurisprudencia en su code.json
             y los agentes Editor/Auditor la pueden leer.
  Dependencias: Módulo 6.
  Riesgo: ALTO (toca code.json).
  ⚠️ REQUIERE REVISIÓN ESPECIAL ANTES DE EJECUTAR.

MÓDULO 9 — Integración con agentes IA
  Objetivo: que Editor y Auditor usen la biblioteca.
  Criterios: agentes pueden citar fallos de la biblioteca.
  Dependencias: Módulo 8.
  Riesgo: medio (toca agentes existentes).

MÓDULO 10 — Búsqueda semántica (opcional)
  Objetivo: embeddings con pgvector.
  Criterios: búsqueda semántica funcional.
  Dependencias: Módulo 6.
  Riesgo: medio (instalar pgvector, generar embeddings).

═══════════════════════════════════════════════════════════════════
SECCIÓN 6 — FASES DE IMPLEMENTACIÓN
═══════════════════════════════════════════════════════════════════

FASE 0 — Preparación (sin tocar producción)
  Entregables: Módulos 1, 2, 3 cerrados.
  Criterio de avance: 3 módulos cerrados y documentados.
  Rollback: no aplica.

FASE 1 — Modelo y datos
  Entregables: Módulo 4 cerrado.
  Criterio: migración sin errores, DB local OK.
  Rollback: git revert schema + prisma migrate reset local.

FASE 2 — Ingesta
  Entregables: Módulo 5 cerrado.
  Criterio: 100 fallos descargados y guardados sin error.
  Rollback: borrar registros del batch.

FASE 3 — Búsqueda y biblioteca
  Entregables: Módulos 6 y 7 cerrados.
  Criterio: usuario puede buscar y ver biblioteca.
  Rollback: feature flag.

FASE 4 — Vinculación
  Entregables: Módulo 8 cerrado.
  Criterio: 3 causas con vinculaciones automáticas útiles.
  Rollback: feature flag.

FASE 5 — Integración con agentes
  Entregables: Módulo 9 cerrado.
  Criterio: Editor puede citar fallos de la biblioteca.
  Rollback: revertir cambios en archivos de agentes.

FASE 6 — Semántica (opcional)
  Entregables: Módulo 10 cerrado.
  Criterio: búsqueda semántica supera a full-text.
  Rollback: desinstalar extensión y borrar tablas.

═══════════════════════════════════════════════════════════════════
SECCIÓN 7 — DECISIONES TOMADAS (ADR log)
═══════════════════════════════════════════════════════════════════

| # | Decisión | Motivo | Fecha | Chat |
|---|----------|--------|-------|------|
| 001 | Todo se desarrolla en LOCAL primero | Riesgo de romper prod | 2026-09-16 | #1 |
| 002 | Eliminar yuandian del código | No se usa | 2026-09-16 | #1 |
| 003 | Eliminar MariaDB | No se usa | 2026-09-16 | #1 |
| 004 | NO tocar schema existente, solo agregar | Minimizar riesgo | 2026-09-16 | #1 |
| 005 | Reutilizar modelo Jurisprudence existente | Ya está en schema | 2026-09-16 | #1 |
| 006 | Usar pipeline de documentos para jurisprudencia | Coherencia | 2026-09-16 | #1 |
| 007 | NO implementar embeddings en Fase 1 | Complejidad | 2026-09-16 | #1 |
| 008 | code.json por caso es INTOCABLE | Fuente de verdad IA | 2026-09-16 | #2 |
| 009 | Flujo Word→txt→Word es INTOCABLE | Base operativa | 2026-09-16 | #2 |
| 010 | Jurisprudence se MODIFICA, no se crea | Ya existe | 2026-09-16 | #2 |
| 011 | Todo cambio respeta el flujo de datos actual | Coherencia | 2026-09-16 | #2 |
| 012 | Trabajar en rama dev, nunca en main | Aislar cambios | 2026-09-16 | #2 |
| 013 | cookies.txt fuera del repo + gitignore | Seguridad | 2026-09-16 | #2 |
| 014 | docs/PLAN.md es el MD del proyecto | Memoria entre chats | 2026-09-16 | #2 |

═══════════════════════════════════════════════════════════════════
SECCIÓN 8 — RIESGOS Y MITIGACIONES
═══════════════════════════════════════════════════════════════════

RIESGO 1 — Romper producción por accidente
  Probabilidad: media. Impacto: alto.
  Mitigación: DB local separada, .env.local, PM2 local.

RIESGO 2 — Fuente de jurisprudencia cambia formato
  Probabilidad: alta. Impacto: medio.
  Mitigación: aislar parser por fuente.

RIESGO 3 — Volumen excede expectativas
  Probabilidad: baja (768G libres). Impacto: bajo.
  Mitigación: monitorear, política de retención.

RIESGO 4 — Agentes IA rompen al integrar biblioteca
  Probabilidad: media. Impacto: alto.
  Mitigación: feature flag, tests antes de activar.

RIESGO 5 — Multi-tenant se rompe al agregar tablas
  Probabilidad: baja. Impacto: alto.
  Mitigación: replicar estructura en TODAS las DBs de estudio.

RIESGO 6 — pgvector no disponible
  Probabilidad: baja. Impacto: bajo.
  Mitigación: es opcional, solo Fase 6.

RIESGO 7 — Token de sesión filtrado en cookies.txt
  Probabilidad: ya ocurrió. Impacto: medio.
  Mitigación: rotar NEXTAUTH_SECRET en server (pendiente Fase 0).

═══════════════════════════════════════════════════════════════════
SECCIÓN 9 — BACKLOG PRIORIZADO
═══════════════════════════════════════════════════════════════════

ALTA PRIORIDAD (Fase 0)
1. Auditoría de agents/jurisprudence/ existente (Módulo 3)
2. Confirmar proveedor IA (Módulo 3)
3. Identificar proceso node --watch root
4. Eliminar yuandian
5. Detener MariaDB
6. Rotar NEXTAUTH_SECRET en server
7. Preparar entorno local (Módulo 2)

MEDIA PRIORIDAD (Fase 1-3)
8. Extender modelo Jurisprudence
9. Ingestor de SAIJ
10. Búsqueda full-text
11. UI biblioteca unificada

BAJA PRIORIDAD (Fase 4-6)
12. Vinculador causa ↔ jurisprudencia
13. Integración con agentes
14. Búsqueda semántica
15. Ingesta de otras fuentes

═══════════════════════════════════════════════════════════════════
SECCIÓN 10 — PREGUNTAS ABIERTAS
═══════════════════════════════════════════════════════════════════

CRÍTICAS (bloquean Módulo 3)
- ¿Qué hace exactamente src/app/(app)/agents/jurisprudence/?
- ¿Qué muestra jurisprudence-agents-view.tsx?
- ¿Cuántos registros hay en tabla Jurisprudence?
- ¿Jurisprudence está en sidebar del dashboard?
- ¿Jurisprudence está en FirmModuleSubscription / ModuleConfig?
- ¿Qué proveedor IA usa src/lib/ai/client.ts?
- ¿Qué es el proceso node --watch como root?

IMPORTANTES (bloquean Módulo 4)
- ¿Qué campos de Jurisprudence se usan hoy?
- ¿Qué campos faltan para que sea útil?
- ¿Cómo se relaciona Jurisprudence.matterId con Matter hoy?

SECUNDARIAS (no bloquean)
- ¿Qué es el contenedor circulo_app puerto 3002?
- ¿Cuántos estudios hay en producción?
- ¿El repo gabibelt80/lawlink-es es público o privado?
- ¿Los archivos sueltos en raíz (pendientes.txt, todos-chinos.txt,
  seed-contenido.txt, estructura.txt, check-*.ts) son legacy?

═══════════════════════════════════════════════════════════════════
SECCIÓN 11 — ESTADO ACTUAL DEL PLAN
═══════════════════════════════════════════════════════════════════

Última actualización: 2026-09-16 (cierre Chat #2)
Rama activa: dev (PC Windows: C:\Users\Gbelt\juridictas\lawlink)
Rama prod: main (server macserver-M, intacta)
Fase actual: FASE 0 (Preparación) — iniciada parcialmente
Módulo en curso: ninguno (Módulo 3 es el próximo)
Próximo paso: cerrar Módulo 3 (auditoría de lo existente)

Bloqueantes:
  - No saber qué hace la UI jurisprudence existente
  - No saber si hay datos en tabla Jurisprudence
  - No saber qué proveedor IA se usa

Pendientes de seguridad (Fase 0):
  - Rotar NEXTAUTH_SECRET en server (por token filtrado)

Archivos modificados en dev:
  - .gitignore (agregado cookies.txt)
  - docs/PLAN.md (creado)
  - cookies.txt (removido del repo, no del disco)
  
Ultima actualizacion: 2026-09-16 (Chat #3)
Rama activa: dev (PC Windows)
Fase actual: FASE 0 (Preparacion)
Modulo en curso: Modulo 3 (auditoria) — 60% cerrado
Proximo paso: arrancar Commit 1 de implementacion (extender modelo Prisma)

Auditoria completada:
- ✅ UI jurisprudence: esqueleto con boton simulado
- ✅ Fuentes configuradas: SAIJ, CIJ, PJN, Fallos CSJN
- ✅ Agentes predefinidos: civil_casacion, laboral_riesgos, penal_garantias
- ✅ Proveedor IA: OpenAI-compatible (Qwen por defecto)
- ⏳ Falta: ver tabla Jurisprudence en DB, ver sidebar

Implementacion a arrancar:
- Commit 1: extender modelo Prisma Jurisprudence
- Commit 2: utilidad ingesta SAIJ
- Commit 3: server action ejecutar agente
- Commit 4: conectar boton Ejecutar
- Commit 5: mostrar fallos guardados en UI

═══════════════════════════════════════════════════════════════════
SECCIÓN 12 — HISTORIAL DE CHATS
═══════════════════════════════════════════════════════════════════

| # | Tema | Resultado | Archivos tocados |
|---|------|-----------|------------------|
| 1 | Relevamiento + creación MD v0.1 | MD v0.1 creado | ninguno (solo lectura) |
| 2 | Limpieza cookies, rama dev, PLAN.md | MD v0.2, rama dev creada | .gitignore, docs/PLAN.md, cookies.txt |
| 3 | Auditoria UI jurisprudence + proveedor IA | MD v0.3, auditoria cerrada | ninguno |

═══════════════════════════════════════════════════════════════════
SECCIÓN 13 — GLOSARIO
═══════════════════════════════════════════════════════════════════

- Matter: caso/expediente en el sistema
- Firm: estudio jurídico (tenant)
- FirmUser: usuario de un estudio
- Document: archivo dentro de un Matter
- FirmFile: archivo de biblioteca del estudio (sin caso)
- WritingTemplate: plantilla de escritos
- Jurisprudence: fallo judicial
- Intake: ingreso previo a Matter
- Procedure: instancia procesal dentro de un Matter
- code.json: JSON maestro por caso con toda su información
- SAIJ: Sistema Argentino de Información Jurídica
- InfoLEG: base de legislación nacional
- PJN: Poder Judicial de la Nación
- MEV: Mesa de Entradas Virtual
- pgvector: extensión PostgreSQL para embeddings
- ADR: Architecture Decision Record
- MD: Markdown / Mapa Maestro de este documento

═══════════════════════════════════════════════════════════════════
SECCIÓN 14 — REGLAS DE ORO (INVIOLABLES)
═══════════════════════════════════════════════════════════════════

1. code.json por caso: INTOCABLE (salvo Módulo 8 con revisión especial)
2. Flujo Word → txt → Word: INTOCABLE
3. Agentes Editor y Auditor existentes: INTOCABLES en su lógica base
4. Multi-tenant por DB: INTOCABLE
5. Jurisprudence: MODIFICAR, no crear
6. agents/jurisprudence/: MODIFICAR, no crear
7. FirmFile: EXTENDER, no duplicar
8. Todo cambio va a LOCAL primero, nunca a PROD directo
9. Sin Módulo 3 cerrado, no se avanza a Módulo 4
10. Si algo no está en este MD, no se hace
11. NADA lleva acentos en codigo:
    - Nombres de archivos, funciones, variables, tipos, tablas, columnas
    - Rutas, URLs, IDs
    - El contenido de texto que ve el usuario SI lleva acentos (fallos, escritos)
12. Cada hallazgo nuevo se agrega INMEDIATAMENTE al MD con "AGREGA AL MD:"
═══════════════════════════════════════════════════════════════════
SECCIÓN 15 — FLUJO DE TRABAJO CON IA (entre chats)
═══════════════════════════════════════════════════════════════════

AL INICIO DE CADA CHAT:
1. Pegar este MD completo.
2. Indicar qué se va a hacer en el chat de hoy.
3. La IA lee el MD completo antes de responder.

DURANTE EL CHAT:
- Se trabaja sobre la sección o módulo que corresponda.
- Cada cambio que se decide se documenta.
- Cada comando se da de a UNO, claro y limpio.

AL FINAL DE CADA CHAT:
1. La IA devuelve el MD completo actualizado (nueva versión).
2. Se guarda en docs/PLAN.md (reemplazando el anterior).
3. Se hace commit + push en rama dev.
4. Se cierra el chat.

REGLA:
- Si algo no está en el MD, no se hace.
- Si el MD está desactualizado, el chat pierde contexto.
- El MD es la única memoria entre chats.

═══════════════════════════════════════════════════════════════════
SECCIÓN 16 — FLUJO GIT
═══════════════════════════════════════════════════════════════════

REPOSITORIO: https://github.com/gabibelt80/lawlink-es.git

RAMAS:
- main  → producción (server macserver-M). INTOCABLE desde PC dev.
- dev   → desarrollo (PC Windows). Todos los cambios van acá.

FLUJO DIARIO:
1. git checkout dev
2. git pull origin dev
3. [trabajar]
4. git add [archivos]
5. git commit -m "tipo: descripción"
6. git push origin dev

CONVENCIONES DE COMMIT:
- feat: nueva funcionalidad
- fix: corrección de bug
- docs: documentación
- chore: mantenimiento
- refactor: reestructuración sin cambio funcional

PASAR CAMBIOS A PRODUCCIÓN (cuando estén listos):
1. Verificar que dev funciona bien en local
2. Crear Pull Request de dev → main en GitHub
3. Revisar el PR
4. Mergear
5. En el server: git pull origin main + pm2 reload lawlink

ROLLBACK:
- Si algo sale mal en dev: git reset --hard [commit-anterior]
- Si algo sale mal en main: git revert [commit]

═══════════════════════════════════════════════════════════════════
SECCION 17 — REGLAS DE TRABAJO CON IA
═══════════════════════════════════════════════════════════════════

COMO PEDIR LAS COSAS:
- El usuario pide UN bloque a la vez, no teoria.
- Comandos de a UNO cuando hay riesgo. Bloques juntos cuando es seguro.
- Respuestas cortas, sin relleno, sin repetir lo que ya esta en el MD.
- No asumir que algo existe: verificar antes.
- No hacer auditorias cuando el usuario pide implementar.

LO QUE LA IA NO DEBE HACER:
- No agregar emojis decorativos en codigo.
- No usar acentos en nombres tecnicos.
- No repetir informacion del MD en cada respuesta.
- No frenar el trabajo con preguntas obvias.
- No asumir estado del sistema sin verificar.

CUANDO ALGO SE ROMPE:
- git reset --hard al commit anterior.
- Documentar en el MD que paso.

AL CERRAR UN CHAT:
- Devolver MD completo actualizado a nueva version.
- Indicar seccion modificada y nueva version.
- Recordar hacer commit + push en dev.
═══════════════════════════════════════════════════════════════════
FIN DEL MAPA MAESTRO — v0.2
═══════════════════════════════════════════════════════════════════
