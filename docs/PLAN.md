📋 Mapa Maestro de Implementación — LawLink / Juridictas v0.1
Con todo lo relevado, ya puedo armar el MD sólido. Este es el documento que vas a pegar al inicio de cada chat nuevo.

markdown
# MAPA MAESTRO DE IMPLEMENTACIÓN — LAWLINK / JURIDICTAS
Versión: 0.1.0
Estado: PLANIFICACIÓN — NO IMPLEMENTAR AÚN
Fecha: 2026-09-16
Próxima revisión: cuando se cierre Fase 0

═══════════════════════════════════════════════════════════════════
REGLA 0 — CÓMO USAR ESTE DOCUMENTO
═══════════════════════════════════════════════════════════════════

- Este MD es la ÚNICA fuente de verdad del proyecto.
- Se pega al inicio de CADA chat nuevo antes de pedir cualquier cosa.
- La IA debe leerlo completo antes de responder.
- Al final de cada chat, la IA devuelve el MD actualizado (sección 11 y 12).
- NUNCA se implementa nada que no esté aprobado acá.
- NUNCA se modifica producción sin que la sección 6 lo autorice.
- Los cambios se versionan: v0.1 → v0.2 → ... nunca se sobreescribe.
- Si un chat se desvía, se cierra y se abre otro con este MD como ancla.

═══════════════════════════════════════════════════════════════════
SECCIÓN 1 — SISTEMA ACTUAL (foto real, sin suposiciones)
═══════════════════════════════════════════════════════════════════

1.1 IDENTIDAD
- Nombre: LawLink (carpeta) / Juridictas (DB y usuario del sistema)
- Ubicación: /opt/juridictas/lawlink/
- Host: macserver-M (Ubuntu 24.04)
- Acceso: Tailscale 100.104.10.13
- Disco: 879G total, 768G libres (suficiente para biblioteca jurisprudencial)

1.2 STACK TÉCNICO CONFIRMADO
- Runtime: Node.js v22.23.2
- Framework: Next.js 16.2.7 (App Router)
- Lenguaje: TypeScript 5.7.2
- ORM: Prisma 5.22.0
- DB principal: PostgreSQL 16.15 (locale es_AR.UTF-8)
- Editor de documentos: Tiptap 3.x + LibreOffice 24.2.7.2 (headless)
- Autenticación: NextAuth 4.24 + Prisma Adapter
- UI: Radix UI + TailwindCSS 3.4 + Recharts + Framer Motion
- Documentos: docx 9.7 + docxtemplater 3.68 + mammoth + html-to-docx
- PDFs: pdfjs-dist + unpdf
- OCR: tesseract.js
- Excel: exceljs
- IA: cliente custom en src/lib/ai/client.ts (proveedor NO confirmado aún)
- i18n: i18next + tacotranslate (chino-español, por herencia)
- Pagos: Mercado Pago
- Monitoreo: Netdata
- Proceso: PM2 (proceso "lawlink", fork mode, online)
- Docker: 2 contenedores activos (circulo_app puerto 3002, circulo_db postgres-alpine)

1.3 ESTRUCTURA DE CARPETAS (nivel 2)
/opt/juridictas/lawlink/
  ├── src/
  │   ├── app/
  │   │   ├── (app)/          ← App autenticada
  │   │   │   ├── agents/      ← Panel de agentes IA
  │   │   │   │   └── jurisprudence/ ← ⚠️ YA EXISTE carpeta
  │   │   │   ├── admin/       ← Super admin
  │   │   │   └── settings/ai/ ← Config IA por estudio
  │   │   └── (legal)/         ← Términos y privacidad
  │   ├── server/
  │   │   ├── admin/
  │   │   ├── ai/              ← ⚠️ 17 archivos de lógica IA
  │   │   ├── settings/        ← Acciones de config IA
  │   │   └── yuandian/        ← ⚠️ A ELIMINAR (no se usa)
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
  ├── escritos/                ← 100+ plantillas .txt de escritos
  ├── escritos-pdf/
  ├── escritos-viejos/
  ├── docs/                    ← documentación (DATA-MODEL.md v0.3)
  ├── public/
  ├── scripts/
  ├── ecosystem.config.js      ← configuración PM2
  └── backups/

1.4 BASE DE DATOS
- PostgreSQL 16.15 local
- DB principal: `juridictas` (schema público + schema `juridictas_juridictas`)
- DB del estudio actual: `juridictas_juridictas`
- Modelo multi-tenant: DB por estudio (Firm + FirmUser en DB principal,
  tablas operativas en DB por estudio)
- 58 tablas en total
- Tamaño actual: 22 MB
- Extensiones: solo plpgsql (⚠️ NO tiene pgvector aún)

⚠️ HALLAZGO CRÍTICO: ya existe modelo `Jurisprudence` en el schema
   con campos: id, title, summary, fullText, court, jurisdiction, fuero,
   date, source, sourceUrl, category, tags[], createdById, matterId.
   Está creado pero probablemente vacío. HAY que revisar su estado real.

⚠️ HALLAZGO CRÍTICO: ya existe carpeta `src/app/(app)/agents/jurisprudence/`
   con componente `jurisprudence-agents-view.tsx`. Verificar qué hace.

1.5 AGENTES IA ACTUALES
Ubicación: src/server/ai/
Archivos confirmados:
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
- save-review.ts            ← guardar resultado de revisión
- actions.ts                ← acciones generales

Configuración: src/lib/ai/client.ts + settings.ts
Config UI: src/app/(app)/settings/ai/  ← POR ESTUDIO
Modelo: NO CONFIRMADO (revisar client.ts para saber proveedor)

1.6 FLUJO DE PROCESAMIENTO DE DOCUMENTOS
- Se suben .docx o .txt
- El sistema convierte a texto plano para que la IA lo procese
- Se guarda el texto editado como .docx
- Visualmente se ve Word, se descarga Word, pero la IA opera sobre texto
- LibreOffice headless hace la conversión
- Documentos tienen: path, sourcePath, sourceMimeType, sha256, encriptación opcional

1.7 CÓMO CORRE EL SERVER
- Proceso: PM2 (`pm2 list` muestra "lawlink" online, id 0)
- Modo: fork (NO cluster)
- Restarts: 50 (⚠️ revisar por qué tantos)
- Memoria: ~200 MB
- Puerto principal: 3000 (next-server v16)
- Puerto secundario: 3002 (docker-proxy, contenedor circulo_app)
- Deploy: ecosystem.config.js (NO systemd)
- Modo watch: PM2 tiene "watching: disabled" ✅
- ⚠️ HALLAZGO: `node --watch src/server.js` corriendo como root (proceso 42968)
  → NO es el server principal, es algo auxiliar. Verificar qué es.

1.8 VARIABLES DE ENTORNO (solo nombres)
NEXTAUTH_SECRET, NEXTAUTH_URL
APP_STORAGE_DIR, STORAGE_ENCRYPTION_KEY
NEXT_PUBLIC_TACOTRANSLATE_PUBLIC_API_KEY, TACOTRANSLATE_SECRET_API_KEY
NEXT_PUBLIC_TACOTRANSLATE_DEFAULT_LOCALE, NEXT_PUBLIC_TACOTRANSLATE_ORIGIN
NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY
MERCADO_PAGO_ACCESS_TOKEN, MERCADO_PAGO_PUBLIC_KEY
MERCADO_PAGO_CLIENT_ID, MERCADO_PAGO_CLIENT_SECRET

⚠️ NO hay OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY ni OLLAMA_URL
   → El proveedor IA debe estar guardado en DB (SystemSetting o similar)
   → CONFIRMAR en src/lib/ai/client.ts y src/lib/ai/settings.ts

═══════════════════════════════════════════════════════════════════
SECCIÓN 2 — QUÉ SE QUIERE AGREGAR (alcance)
═══════════════════════════════════════════════════════════════════

2.1 MÓDULO JURISPRUDENCIA
- Ingesta de fallos desde fuentes externas (SAIJ, InfoLEG, CSJN, cámaras)
- Almacenamiento local en DB (ya hay modelo Jurisprudence)
- Procesamiento a texto plano (reutiliza flujo existente)
- Búsqueda full-text y semántica
- Vinculación con causas (Matter)
- Descarga de PDFs y almacenamiento en storage/

2.2 BIBLIOTECA UNIFICADA
- Documentos propios del estudio (ya existen: FirmFile, WritingTemplate)
- Documentos descargados (nuevo)
- Documentos en procesamiento (nuevo)
- Todo bajo el mismo flujo de conversión

2.3 FUERA DE ALCANCE (explícito)
- NO tocar producción hasta que Fase 0 esté validada
- NO modificar el modelo de datos existente sin migración controlada
- NO romper el flujo actual de escritos
- NO tocar la DB principal (solo la DB del estudio)
- NO reescribir el schema Prisma existente

═══════════════════════════════════════════════════════════════════
SECCIÓN 3 — ARQUITECTURA PROPUESTA (conceptual)
═══════════════════════════════════════════════════════════════════

3.1 PRINCIPIO RECTOR
Todo lo nuevo se agrega como MÓDULO, no se modifica lo existente.
Se usan los puntos de extensión que YA existen:
- Modelo Jurisprudence (ya en schema)
- Carpeta agents/jurisprudence (ya en UI)
- FirmFile (ya para biblioteca)
- Document (ya para archivos)
- Sistema de módulos por estudio (FirmModuleSubscription)

3.2 COMPONENTES NUEVOS
- Ingestor de fuentes (SAIJ, InfoLEG, CSJN, cámaras) → nuevo
- Procesador de jurisprudencia → reutiliza pipeline de documentos
- Indexador de texto → a definir (full-text primero, embeddings después)
- Vinculador causa↔jurisprudencia → nuevo
- UI de biblioteca → extiende agents/jurisprudence existente

3.3 INTEGRACIÓN SIN ROMPER
- Se usa Prisma migrate dev en local para agregar campos nuevos
- Se usa FirmModuleSubscription para activar/desactivar el módulo por estudio
- Se usa SystemSetting para configurar fuentes por estudio
- Se usa ReviewRecord y Document para trazabilidad

═══════════════════════════════════════════════════════════════════
SECCIÓN 4 — MODELO DE DATOS (cambios propuestos)
═══════════════════════════════════════════════════════════════════

4.1 MODELO Jurisprudence EXISTENTE (revisar y extender)
Actualmente tiene:
  id, title, summary, fullText, court, jurisdiction, fuero,
  date, source, sourceUrl, category, tags[], createdById, matterId

A AGREGAR (propuesta, revisar en Fase 2):
  - fingerprint String @unique  ← para deduplicar
  - hash String                  ← sha256 del contenido
  - pdfPath String?              ← ruta al PDF descargado
  - status String                ← pending/downloaded/processed/error
  - processedAt DateTime?
  - ingestBatchId String?        ← trazabilidad de ingesta
  - citedInMatters Matter[]      ← relación N:M con causas

4.2 MODELOS NUEVOS (solo si hacen falta)
- JurisprudenceSource (catálogo de fuentes)
- JurisprudenceRelation (jurisprudencia ↔ jurisprudencia, citas)
- JurisprudenceMatterLink (jurisprudencia ↔ causa, con tipo de vínculo)
- JurisprudenceIngestLog (historial de ingesta)

4.3 MODELO Library EXISTENTE
- FirmFile: archivos del estudio (ya tiene categorías POLICY/GUIDE/TEMPLATE/REFERENCE/etc.)
- WritingTemplate: plantillas de escritos
- Document: documentos de cada Matter

A AGREGAR (propuesta):
- LibraryItem (biblioteca unificada, sin importar origen)
  - id, type (own/downloaded/processing), sourceUrl, metadata Json
  - Vinculado a FirmFile o Jurisprudence según type

4.4 REGLAS DE DATOS
- IDs: cuid() (consistente con el resto)
- Fechas: DateTime con @default(now())
- Tags: String[] (consistente con FirmFile)
- Índices: @@index en campos de búsqueda frecuente
- No tocar modelos existentes sin migración controlada

═══════════════════════════════════════════════════════════════════
SECCIÓN 5 — MÓDULOS A CONSTRUIR (uno por uno)
═══════════════════════════════════════════════════════════════════

Cada módulo se construye en este orden. No se avanza al siguiente
sin cerrar el anterior con criterios de aceptación cumplidos.

MÓDULO 1 — Revisión y limpieza del sistema actual
  Objetivo: eliminar yuandian, MariaDB, procesos auxiliares desconocidos.
  Criterios: cero referencias a yuandian, MariaDB detenido, documentado.
  Dependencias: ninguna.
  Riesgo: bajo (solo en local).

MÓDULO 2 — Preparación del entorno local
  Objetivo: replicar prod en local para trabajar sin riesgo.
  Criterios: DB local clonada, .env.local configurado, PM2 local, sin tocar prod.
  Dependencias: Módulo 1.
  Riesgo: bajo.

MÓDULO 3 — Confirmación de proveedor IA
  Objetivo: saber exactamente qué proveedor usa el sistema hoy.
  Criterios: documentado en MD (sección 1.5), cliente IA identificado.
  Dependencias: Módulo 2.
  Riesgo: nulo (solo lectura).

MÓDULO 4 — Extensión de modelo Jurisprudence
  Objetivo: agregar campos para ingesta y procesamiento.
  Criterios: migración de Prisma validada, DB local actualizada.
  Dependencias: Módulo 2.
  Riesgo: bajo (campos nuevos, no modificaciones).

MÓDULO 5 — Ingestor de fuentes (una sola, la primera)
  Objetivo: bajar fallos de UNA fuente (a definir) y guardarlos.
  Criterios: descarga, procesa, guarda en DB, guarda PDF.
  Dependencias: Módulo 4.
  Riesgo: medio (depende de la fuente).

MÓDULO 6 — Indexador de jurisprudencia
  Objetivo: búsqueda full-text sobre fullText.
  Criterios: búsqueda funcional en UI, resultados ordenados.
  Dependencias: Módulo 5.
  Riesgo: bajo (PostgreSQL tiene tsvector nativo).

MÓDULO 7 — Biblioteca unificada
  Objetivo: UI que muestre propias + descargadas + en proceso.
  Criterios: panel unificado, filtros, acciones por tipo.
  Dependencias: Módulo 5.
  Riesgo: bajo (solo UI + queries).

MÓDULO 8 — Vinculador causa ↔ jurisprudencia
  Objetivo: asociar fallos a causas automática y manualmente.
  Criterios: sugerencias automáticas, vinculación manual, UI.
  Dependencias: Módulo 6.
  Riesgo: medio (algoritmo de matching).

MÓDULO 9 — Integración con agentes IA
  Objetivo: que Editor y Auditor usen la biblioteca.
  Criterios: los agentes pueden citar fallos de la biblioteca.
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
  Duración estimada: 1-2 sesiones de chat
  Entregables:
    - Módulo 1 cerrado (limpieza)
    - Módulo 2 cerrado (local listo)
    - Módulo 3 cerrado (proveedor IA identificado)
  Criterio de avance a Fase 1: los 3 módulos cerrados y documentados.
  Rollback: no aplica (nada productivo se toca).

FASE 1 — Modelo y datos
  Duración estimada: 1-2 sesiones de chat
  Entregables:
    - Módulo 4 cerrado (schema extendido)
    - Prisma migrate aplicado en local
  Criterio de avance: migración sin errores, DB local OK.
  Rollback: git revert del schema + prisma migrate reset local.

FASE 2 — Ingesta
  Duración estimada: 2-3 sesiones de chat
  Entregables:
    - Módulo 5 cerrado (ingestor de una fuente)
    - Script de ingesta funcional
  Criterio de avance: 100 fallos descargados y guardados sin error.
  Rollback: borrar registros ingresados por el batch.

FASE 3 — Búsqueda y biblioteca
  Duración estimada: 2-3 sesiones de chat
  Entregables:
    - Módulo 6 cerrado (búsqueda)
    - Módulo 7 cerrado (biblioteca UI)
  Criterio de avance: usuario puede buscar y ver biblioteca.
  Rollback: feature flag para ocultar el módulo.

FASE 4 — Vinculación
  Duración estimada: 2-3 sesiones de chat
  Entregables:
    - Módulo 8 cerrado (vinculador)
  Criterio de avance: 3 causas con vinculaciones automáticas útiles.
  Rollback: feature flag.

FASE 5 — Integración con agentes
  Duración estimada: 2 sesiones de chat
  Entregables:
    - Módulo 9 cerrado (agentes usan biblioteca)
  Criterio de avance: Editor puede citar fallos de la biblioteca.
  Rollback: revertir cambios en archivos de agentes.

FASE 6 — Semántica (opcional)
  Duración estimada: 2-3 sesiones de chat
  Entregables:
    - Módulo 10 cerrado (pgvector)
  Criterio de avance: búsqueda semántica supera a full-text en 5 casos reales.
  Rollback: desinstalar extensión y borrar tablas de embeddings.

═══════════════════════════════════════════════════════════════════
SECCIÓN 7 — DECISIONES TOMADAS (ADR log)
═══════════════════════════════════════════════════════════════════

| # | Decisión | Motivo | Fecha | Chat |
|---|----------|--------|-------|------|
| 001 | Todo se desarrolla en LOCAL primero | Riesgo de romper prod | 2026-09-16 | #1 |
| 002 | Eliminar yuandian del código | No se usa, código chino residual | 2026-09-16 | #1 |
| 003 | Eliminar MariaDB | No se usa | 2026-09-16 | #1 |
| 004 | NO tocar schema existente, solo agregar | Minimizar riesgo | 2026-09-16 | #1 |
| 005 | Reutilizar modelo Jurisprudence existente | Ya está en schema, evita duplicar | 2026-09-16 | #1 |
| 006 | Usar flujo de documentos existente para jurisprudencia | Coherencia arquitectónica | 2026-09-16 | #1 |
| 007 | NO implementar embeddings en Fase 1 | Complejidad innecesaria al inicio | 2026-09-16 | #1 |

═══════════════════════════════════════════════════════════════════
SECCIÓN 8 — RIESGOS Y MITIGACIONES
═══════════════════════════════════════════════════════════════════

RIESGO 1 — Romper producción por accidente
  Probabilidad: media
  Impacto: alto
  Mitigación: trabajar en DB local separada, .env.local, PM2 local.

RIESGO 2 — Fuente de jurisprudencia cambia formato
  Probabilidad: alta
  Impacto: medio
  Mitigación: aislar el parser por fuente, fácil de actualizar.

RIESGO 3 — Volumen de datos excede expectativas
  Probabilidad: baja (768G libres)
  Impacto: bajo
  Mitigación: monitorear tamaño, política de retención.

RIESGO 4 — Los agentes IA rompen al integrar biblioteca
  Probabilidad: media
  Impacto: alto
  Mitigación: feature flag, tests antes de activar.

RIESGO 5 — Multi-tenant se rompe al agregar tablas
  Probabilidad: baja
  Impacto: alto
  Mitigación: replicar estructura en TODAS las DBs de estudio.

RIESGO 6 — pgvector no disponible en el server
  Probabilidad: baja
  Impacto: bajo
  Mitigación: es opcional, solo Fase 6.

═══════════════════════════════════════════════════════════════════
SECCIÓN 9 — BACKLOG PRIORIZADO
═══════════════════════════════════════════════════════════════════

ALTA PRIORIDAD (Fase 0-1)
1. Eliminar yuandian
2. Detener MariaDB
3. Identificar proceso node --watch como root
4. Confirmar proveedor IA en src/lib/ai/client.ts
5. Clonar DB a local
6. Revisar src/app/(app)/agents/jurisprudence/ existente

MEDIA PRIORIDAD (Fase 2-3)
7. Extender modelo Jurisprudence
8. Ingestor de SAIJ
9. Búsqueda full-text
10. UI biblioteca unificada

BAJA PRIORIDAD (Fase 4-6)
11. Vinculador causa ↔ jurisprudencia
12. Integración con agentes
13. Búsqueda semántica
14. Ingesta de otras fuentes (InfoLEG, CSJN, cámaras)

═══════════════════════════════════════════════════════════════════
SECCIÓN 10 — PREGUNTAS ABIERTAS
═══════════════════════════════════════════════════════════════════

- ¿Qué proveedor IA usan los agentes? (revisar client.ts)
- ¿Qué hace exactamente src/app/(app)/agents/jurisprudence/?
- ¿El modelo Jurisprudence tiene datos o está vacío?
- ¿Qué es el proceso node --watch como root?
- ¿Qué es el contenedor circulo_app en puerto 3002?
- ¿Los escritos en /escritos/ se usan o son legacy?
- ¿Hay más estudios en producción además de juridictas?
- ¿Se puede instalar pgvector sin downtime?
- ¿Cuál es la primera fuente de jurisprudencia a integrar?

═══════════════════════════════════════════════════════════════════
SECCIÓN 11 — ESTADO ACTUAL DEL PLAN
═══════════════════════════════════════════════════════════════════

Última actualización: 2026-09-16
Chat: #1
Fase actual: FASE 0 (Preparación) — no iniciada
Módulo en curso: ninguno
Próximo paso: confirmar respuestas a Preguntas Abiertas y cerrar Módulo 1
Bloqueantes: 3 (proveedor IA, estado de jurisprudence existente, proceso root)
Archivos modificados: ninguno

═══════════════════════════════════════════════════════════════════
SECCIÓN 12 — HISTORIAL DE CHATS
═══════════════════════════════════════════════════════════════════

| # | Tema | Resultado | Archivos tocados |
|---|------|-----------|------------------|
| 1 | Relevamiento completo + creación del MD | MD v0.1 creado | ninguno (solo lectura) |

═══════════════════════════════════════════════════════════════════
SECCIÓN 13 — GLOSARIO
═══════════════════════════════════════════════════════════════════

- Matter: caso/expediente en el sistema
- Firm: estudio jurídico (tenant)
- FirmUser: usuario de un estudio
- Document: archivo dentro de un Matter
- FirmFile: archivo de la biblioteca del estudio (sin caso)
- WritingTemplate: plantilla de escritos
- Jurisprudence: fallo judicial
- Intake: ingreso de caso previo a convertirse en Matter
- Procedure: instancia procesal dentro de un Matter
- SAIJ: Sistema Argentino de Información Jurídica
- InfoLEG: base de legislación nacional
- PJN: Poder Judicial de la Nación
- MEV: Mesa de Entradas Virtual
- pgvector: extensión PostgreSQL para embeddings

1. code.json por caso — NO tocar
text
Cada Matter genera:
  storage/matters/[CODE]/
    ├── code.json     ← TODO lo del caso (fuente de verdad para IA)
    └── [archivos]

El code.json alimenta a los agentes IA (Editor + Auditor).
El cliente no ve esto.
⚠️ NO TOCAR.
2. El flujo .txt de escritos — NO TOCAR
text
Los .txt de /escritos/ son parte del pipeline actual.
La IA los procesa, LibreOffice convierte, se guarda como .docx.
⚠️ JAMÁS TOCAR. Es la base del sistema.
3. Jurisprudence — MODIFICAR, no crear
text
Ya existe el modelo. Ya existe la UI.
El trabajo NO es "crear jurisprudencia".
El trabajo ES "modificar lo que existe para que funcione de verdad".
📝 Cambios al MD
Reemplazá estas secciones del MD v0.1 por las siguientes:

🔄 REEMPLAZA Sección 1.6 completa por:
markdown
1.6 FLUJO DE PROCESAMIENTO DE DOCUMENTOS (NO TOCAR)

1.6.1 Documentos de caso
- Cada Matter genera carpeta: storage/matters/[CODE]/
- Dentro hay un code.json con TODO lo del caso
- Ese JSON es la fuente de verdad para los agentes IA
- Los agentes (Editor, Auditor) leen de ahí
- El cliente NO ve esto

1.6.2 Documentos Word / escritos
- Se suben .docx o .txt
- El sistema convierte a texto plano
- La IA opera sobre texto plano
- LibreOffice headless regenera .docx
- Visualmente se ve Word, se descarga Word
- ⚠️ ESTE FLUJO ES INTOCABLE. JAMÁS TOCAR.
- Es la base operativa del sistema.

1.6.3 Implicancia para jurisprudencia
- La jurisprudencia nueva DEBE respetar estos dos flujos:
  · Si se asocia a un caso → va al code.json del caso
  · Si es documentación → usa el flujo de documentos existente
- NO inventar flujos paralelos.
🔄 REEMPLAZA Sección 2.1 completa por:
markdown
2.1 MÓDULO JURISPRUDENCIA (modificar lo existente, no crear)

2.1.1 Estado actual (a verificar en Módulo 3)
- Modelo `Jurisprudence` YA EXISTE en schema.prisma
- UI `src/app/(app)/agents/jurisprudence/` YA EXISTE
- NO SE CREA DESDE CERO. SE MODIFICA Y SE COMPLETA.

2.1.2 Objetivo real
- Hacer que la jurisprudencia EXISTENTE funcione de verdad
- Agregar lo que le falta (ingesta, procesamiento, búsqueda)
- Integrarla con el flujo actual del sistema (code.json + documentos)
- NO rediseñar. NO reemplazar. COMPLETAR.

2.1.3 Lo que hay que averiguar antes de tocar nada
- ¿Qué campos del modelo Jurisprudence se usan hoy?
- ¿Qué hace exactamente jurisprudence-agents-view.tsx?
- ¿Hay datos cargados o está vacío?
- ¿Está conectado al sistema de módulos por estudio?
- ¿Está en el sidebar del dashboard?
🔄 REEMPLAZA Sección 3.1 completa por:
markdown
3.1 PRINCIPIO RECTOR (actualizado)

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
- Si la jurisprudencia se asocia a un caso → va al code.json
- Si es documentación general → va por flujo de documentos
- NO crear rutas paralelas de datos
🔄 REEMPLAZA Sección 5 — Módulo 3, 4 y 8 por:
markdown
MÓDULO 3 — Auditoría de lo existente (CRÍTICO)
  Objetivo: entender qué hay antes de tocar.
  Tareas:
    a) Leer src/app/(app)/agents/jurisprudence/ completo
    b) Leer jurisprudence-agents-view.tsx completo
    c) Query a DB: SELECT COUNT(*) FROM "Jurisprudence";
    d) Ver si Jurisprudence está en FirmModuleSubscription
    e) Ver si aparece en el sidebar del dashboard
    f) Ver cómo se relaciona con code.json (si lo hace)
    g) Confirmar proveedor IA en src/lib/ai/client.ts
  Criterios: informe escrito de qué existe y qué falta.
  Dependencias: Módulo 2.
  Riesgo: nulo (solo lectura).
  ⚠️ SIN ESTE MÓDULO CERRADO, NO SE AVANZA AL MÓDULO 4.

MÓDULO 4 — Modificación del modelo Jurisprudence
  Objetivo: agregar campos que faltan SIN romper lo existente.
  Tareas:
    a) Definir qué campos agregar (basado en Módulo 3)
    b) Prisma migrate dev en LOCAL
    c) Verificar que queries existentes siguen funcionando
    d) Verificar que la UI existente no se rompe
  Criterios: migración aplicada, UI sigue funcionando, tests pasan.
  Dependencias: Módulo 3.
  Riesgo: medio (tocar modelo existente).

MÓDULO 8 — Integración con code.json (NO con agentes)
  Objetivo: que la jurisprudencia asociada a un caso llegue al code.json.
  Tareas:
    a) Definir formato de entrada en code.json
    b) Extender la lógica de generación de code.json (SIN ROMPER el actual)
    c) Probar con un caso de prueba en LOCAL
  Criterios: un caso de prueba tiene jurisprudencia vinculada en su code.json
             y los agentes Editor/Auditor la pueden leer.
  Dependencias: Módulo 6.
  Riesgo: ALTO (toca code.json que es intocable).
  ⚠️ ESTE MÓDULO REQUIERE REVISIÓN ESPECIAL ANTES DE EJECUTAR.
🔄 AGREGA al final de la Sección 7 (ADR log):
markdown
| 008 | code.json por caso es INTOCABLE | Fuente de verdad de IA | 2026-09-16 | #2 |
| 009 | Flujo Word→txt→Word es INTOCABLE | Base operativa del sistema | 2026-09-16 | #2 |
| 010 | Jurisprudence se MODIFICA, no se crea | Ya existe en schema y UI | 2026-09-16 | #2 |
| 011 | Todo cambio debe respetar el flujo de datos actual | Coherencia arquitectónica | 2026-09-16 | #2 |
🔄 REEMPLAZA Sección 10 — Preguntas abiertas por:
markdown
CRÍTICAS (bloquean Módulo 3)
- ¿Qué hace exactamente src/app/(app)/agents/jurisprudence/?
- ¿Qué muestra jurisprudence-agents-view.tsx?
- ¿Cuántos registros hay en la tabla Jurisprudence?
- ¿Jurisprudence está en el sidebar del dashboard?
- ¿Jurisprudence está en FirmModuleSubscription / ModuleConfig?
- ¿Qué proveedor IA usa src/lib/ai/client.ts?

IMPORTANTES (bloquean Módulo 4)
- ¿Qué campos de Jurisprudence se usan hoy?
- ¿Qué campos faltan para que sea útil?
- ¿Cómo se relaciona Jurisprudence.matterId con Matter hoy?

SECUNDARIAS (no bloquean)
- ¿Qué es el proceso node --watch como root?
- ¿Qué es el contenedor circulo_app puerto 3002?
- ¿Cuántos estudios hay en producción?
🔄 REEMPLAZA Sección 11 — Estado actual por:
markdown
Última actualización: 2026-09-16
Chat: #2
Fase actual: FASE 0 (Preparación) — no iniciada
Módulo en curso: ninguno (Módulo 3 es el próximo)
Próximo paso: cerrar Módulo 3 (auditoría de lo existente)
Bloqueantes:
  - No saber qué hace la UI jurisprudence existente
  - No saber si hay datos en la tabla
  - No saber qué proveedor IA se usa
Archivos modificados: ninguno
🔄 AGREGA Sección 14 — REGLAS DE ORO
markdown
═══════════════════════════════════════════════════════════════════
SECCIÓN 14 — REGLAS DE ORO (INVIOLABLES)
═══════════════════════════════════════════════════════════════════

1. code.json por caso: INTOCABLE
2. Flujo Word → txt → Word: INTOCABLE
3. Agentes Editor y Auditor existentes: INTOCABLES en su lógica base
4. Multi-tenant por DB: INTOCABLE
5. Jurisprudence: MODIFICAR, no crear
6. agents/jurisprudence/: MODIFICAR, no crear
7. FirmFile: EXTENDER, no duplicar
8. Todo cambio va a LOCAL primero, nunca a PROD directo
9. Sin Módulo 3 cerrado, no se avanza a Módulo 4
10. Si algo no está en este MD, no se hace

═══════════════════════════════════════════════════════════════════
🎯 MD actualizado a v0.2
Ahora el MD refleja tu realidad:

✅ code.json marcado como intocable

✅ Flujo Word marcado como intocable

✅ Jurisprudence como "modificar", no "crear"

✅ Nuevo Módulo 3 (auditoría) que bloquea todo lo demás

✅ Reglas de oro explícitas

✅ Nuevas ADRs

