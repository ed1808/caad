# CAAD — Backlog priorizado post-MVP

**Producto:** CAAD (*Computer Assisted API Design*)  
**Versión del backlog:** 1.0  
**Fecha:** 18 de octubre de 2026  
**Estado:** Propuesta priorizada para planificación e implementación incremental  
**Documento de referencia:** `PROJECT_SPECS.md`

---

## 1. Objetivo

Este backlog define una ruta de evolución posterior al MVP de CAAD. Busca que la aplicación pase de permitir diseñar, validar y exportar contratos OpenAPI a ayudar al desarrollador a **evolucionarlos de forma segura, aplicar convenciones consistentes, preparar integraciones y comprobar la conformidad de implementaciones**.

El backlog se organiza por valor para el desarrollador, dependencias técnicas, riesgo y complejidad relativa. No representa un compromiso de fechas. Cada historia debe implementarse en incrementos verificables.

## 2. Principios y límites de alcance

Las siguientes decisiones del documento maestro continúan vigentes salvo que se aprueben explícitamente mediante un ADR:

- **Local-first:** la funcionalidad principal no requiere cuentas ni conexión a la nube.
- **Modelo interno como fuente de verdad:** interfaz, diagnósticos, comparaciones y exportación deben derivarse del modelo de dominio compartido.
- **Validación determinista:** las reglas de contrato y los controles esenciales deben funcionar sin IA generativa.
- **Sin pérdida silenciosa:** una importación, transformación o exportación debe informar las limitaciones de representación.
- **Control del usuario:** las operaciones destructivas y los cambios sugeridos se presentan para revisión antes de aplicarlos.
- **Separación de responsabilidades:** Rust y el dominio contienen reglas de negocio; el frontend no duplica el motor de validación.
- **Compatibilidad declarada con precisión:** no presentar como validación completa del estándar una validación que cubra solo un subconjunto.

El backlog **no** incorpora por ahora generación integral de backends, alojamiento público, colaboración en tiempo real ni soporte simultáneo de múltiples paradigmas de API. El servidor mock y las pruebas HTTP se plantean como herramientas locales y acotadas alrededor del contrato REST/OpenAPI.

## 3. Convenciones de priorización

### Prioridad

| Nivel | Significado | Tratamiento |
|---|---|---|
| **P0 — Fundacional** | Necesario para reducir el riesgo de ampliar el producto sobre una base frágil. | Completar antes de iniciar las nuevas épicas funcionales. |
| **P1 — Alta** | Valor directo y frecuente para el desarrollador; define la diferenciación central de CAAD. | Primer bloque de producto. |
| **P2 — Media-alta** | Mejora significativamente el flujo de trabajo, con mayor complejidad o dependencias. | Después de estabilizar las capacidades P1. |
| **P3 — Estratégica** | Integra CAAD en flujos externos de desarrollo y automatización. | Implementar cuando el núcleo esté estable. |
| **P4 — Exploratoria** | Capacidades asistidas por IA que necesitan guardas de privacidad y cambios controlados. | No bloquear mejoras deterministas por esta línea. |

### Complejidad relativa

- **S:** cambio acotado, pocas dependencias nuevas.
- **M:** varias capas o modelos implicados; requiere pruebas de integración.
- **L:** nueva capacidad transversal, ejecución de procesos/red o cambios arquitectónicos significativos.

La complejidad se debe reevaluar después de inspeccionar el repositorio. No equivale a una estimación de horas o días.

## 4. Resumen del roadmap

| Orden | Hito | Objetivo | Historias principales | Prioridad |
|---|---|---|---|---|
| 0 | Preparar la siguiente versión | Verificar la base real, cerrar huecos de pruebas y preservar el comportamiento actual. | `CAAD-POST-001`, `CAAD-POST-002` | P0 |
| 1 | Evolución segura de contratos | Comparar definiciones y detectar cambios incompatibles con explicaciones accionables. | `CAAD-POST-101` a `103` | P1 |
| 2 | Estándares de diseño por proyecto | Configurar convenciones y gestionar excepciones justificadas. | `CAAD-POST-201`, `202` | P1 |
| 3 | Comprender y refactorizar el diseño | Visualizar dependencias y aplicar cambios de nombre sin dejar referencias rotas. | `CAAD-POST-301`, `302` | P1/P2 |
| 4 | Ejemplos y datos de contrato | Validar y generar ejemplos JSON a partir de los esquemas. | `CAAD-POST-401`, `402` | P1/P2 |
| 5 | Historial y recuperación | Crear revisiones locales recuperables y comparables. | `CAAD-POST-501` | P2 |
| 6 | Desarrollo sin backend disponible | Generar respuestas desde un servidor mock local. | `CAAD-POST-601`, `602` | P2 |
| 7 | Comprobar una implementación real | Ejecutar pruebas focalizadas de conformidad frente a un servidor configurado. | `CAAD-POST-701` | P3 |
| 8 | Integración con el trabajo diario | Crear snippets, una validación headless y ejemplos de CI. | `CAAD-POST-801` a `803` | P3 |
| 9 | Asistencia inteligente controlada | Proponer cambios estructurados con validación y aprobación explícita. | `CAAD-POST-901`, `902` | P4 |

**Ruta recomendada:** no comenzar mock server, IA o integración con CI antes de cerrar el hito 0 y tener al menos una versión estable del comparador y del sistema de reglas.

---

# 5. Backlog detallado

## Hito 0 — Preparación post-MVP

### CAAD-POST-001 — Verificar la base real y registrar el baseline post-MVP

**Prioridad:** P0 · **Complejidad:** S/M · **Tipo:** ingeniería/calidad

**Historia de usuario**  
Como mantenedor de CAAD, quiero confirmar qué partes del MVP están implementadas y probadas en el repositorio real para construir la siguiente versión sin duplicar funciones ni introducir regresiones.

**Alcance**
- Inspeccionar arquitectura, comandos existentes, estructura del modelo interno, persistencia y manejo de errores.
- Ejecutar las comprobaciones ya configuradas y registrar sus resultados reales.
- Identificar limitaciones conocidas de importación/exportación OpenAPI y cobertura de pruebas.
- Actualizar el estado del README y de la documentación de arquitectura si están desalineados con el repositorio.

**Criterios de aceptación**
1. Existe un informe breve con las capacidades post-MVP relevantes y el estado real de cada una: implementada, parcial, no implementada o no verificada.
2. Se registran los comandos realmente ejecutados y los resultados, incluidos los bloqueos del entorno.
3. No se modifica comportamiento funcional como parte de esta historia, salvo correcciones necesarias y aprobadas para que las pruebas existentes puedan ejecutarse.
4. Las diferencias importantes entre `PROJECT_SPECS.md` y el código quedan documentadas con una decisión recomendada; no se resuelven silenciosamente.
5. Queda identificado el módulo apropiado para reutilizar el dominio y las reglas en futuras funciones sin acoplarlas a React/Tauri.

**Dependencias:** ninguna.  
**Riesgos:** asumir que la especificación describe exactamente el estado actual del repositorio.  
**Definición de terminado específica:** informe incorporado a `docs/milestones/` o ubicación equivalente y documentación desactualizada identificada.

### CAAD-POST-002 — Crear un conjunto de regresión de OpenAPI

**Prioridad:** P0 · **Complejidad:** M · **Tipo:** calidad/interoperabilidad

**Historia de usuario**  
Como desarrollador, quiero disponer de fixtures representativos para verificar que las futuras mejoras no rompan la importación, la exportación ni el contenido de los contratos existentes.

**Alcance**
- Reutilizar las pruebas existentes y ampliarlas solo donde falten casos relevantes.
- Incluir documentos JSON/YAML correctos, documentos sintácticamente inválidos y documentos que contengan características fuera del subconjunto admitido.
- Verificar equivalencia semántica en ciclos de importación/exportación, no igualdad textual byte por byte.

**Criterios de aceptación**
1. Los fixtures prueban, como mínimo, rutas y métodos, parámetros, cuerpos, respuestas, esquemas reutilizables y referencias internas.
2. Hay casos de referencias rotas, referencias circulares y construcciones no soportadas.
3. Un fallo de importación no altera el proyecto que estaba abierto antes de importar.
4. Una característica no representable genera un diagnóstico o informe explícito; no desaparece silenciosamente.
5. Las comprobaciones pueden ejecutarse con un comando documentado y se incluyen en el flujo normal de pruebas.

**Dependencias:** `CAAD-POST-001`.  
**Riesgos:** ampliar la promesa de compatibilidad sin respaldo de pruebas.  
**Definición de terminado específica:** fixtures versionados en el repositorio, comandos documentados y resultados comprobados.

---

## Hito 1 — Evolución segura de contratos

### CAAD-POST-101 — Comparar dos definiciones de API

**Prioridad:** P1 · **Complejidad:** M/L · **Tipo:** funcionalidad central

**Historia de usuario**  
Como desarrollador, quiero comparar la definición actual con una definición de referencia para comprender exactamente qué cambió entre dos contratos.

**Alcance inicial**
- Permitir elegir como referencia otro archivo OpenAPI compatible o una definición guardada, si el historial ya está disponible.
- Comparar semánticamente operaciones, rutas, métodos, parámetros, cuerpos, respuestas, esquemas y componentes relevantes.
- Presentar un diff agrupado por categoría con ubicación navegable dentro de CAAD.
- No modificar ninguna de las definiciones comparadas.

**Criterios de aceptación**
1. El usuario puede seleccionar una definición de referencia y comparar sin sobrescribir el proyecto actual.
2. Las diferencias se clasifican al menos como añadido, eliminado y modificado.
3. El resultado identifica el elemento afectado —por ejemplo, método/ruta, parámetro, respuesta o esquema— y permite navegar a él cuando sea editable.
4. Se ignoran diferencias puramente de formato u orden de serialización cuando no cambian el significado del contrato.
5. Si alguna de las definiciones contiene construcciones que CAAD no puede comparar fielmente, el resultado lo indica y no presenta la comparación como completa.
6. Una comparación con la misma definición no informa falsamente cambios funcionales.
7. La comparación es determinista para las mismas definiciones y la misma versión del algoritmo.

**Dependencias:** `CAAD-POST-001`, `CAAD-POST-002`.  
**Riesgos:** confundir diferencias textuales con diferencias semánticas; cambios de modelo interno.  
**Definición de terminado específica:** pruebas unitarias para el algoritmo de diff y pruebas de integración de la navegación desde diferencias hasta los elementos de diseño.

### CAAD-POST-102 — Analizar compatibilidad de cambios

**Prioridad:** P1 · **Complejidad:** M/L · **Tipo:** funcionalidad central

**Historia de usuario**  
Como desarrollador que mantiene una API consumida por otros sistemas, quiero saber qué cambios podrían romper consumidores existentes antes de publicar una nueva versión.

**Alcance inicial**
- Analizar el resultado de `CAAD-POST-101` con un catálogo de reglas versionadas.
- Clasificar hallazgos como **potencialmente incompatible**, **posiblemente compatible** o **requiere revisión**, según reglas y contexto.
- Explicar por qué se generó el hallazgo y qué elemento cambió.
- Distinguir reglas estructurales ciertas de heurísticas dependientes de las convenciones del proyecto.

**Casos que deben investigarse e implementarse con pruebas**
- Eliminación de una operación existente.
- Eliminación de una respuesta documentada.
- Adición de un parámetro obligatorio.
- Adición de una propiedad obligatoria a un cuerpo de solicitud.
- Eliminación o estrechamiento de valores admitidos en enumeraciones y restricciones.
- Cambios en los esquemas de solicitud frente a los de respuesta.
- Cambios en esquemas reutilizados que afectan varias operaciones.

**Criterios de aceptación**
1. Cada hallazgo contiene identificador de regla, severidad, explicación, ubicación y recomendación cuando sea razonable.
2. La clasificación tiene en cuenta si el elemento pertenece a una solicitud o a una respuesta cuando esto afecte la compatibilidad.
3. Los casos ambiguos se marcan como “requiere revisión”; no se declaran automáticamente seguros o incompatibles sin base documentada.
4. Las reglas son deterministas y tienen pruebas que cubren los casos positivos y negativos.
5. La pantalla del informe distingue claramente errores del estándar, cambios incompatibles potenciales y recomendaciones de estilo.
6. El usuario puede consultar la regla aplicada y conocer sus límites.

**Dependencias:** `CAAD-POST-101`.  
**Riesgos:** una etiqueta de compatibilidad demasiado categórica puede inducir errores en producción.  
**Definición de terminado específica:** catálogo documentado en `docs/COMPATIBILITY_RULES.md` o equivalente, con ejemplos de cada regla.

### CAAD-POST-103 — Exportar informe de diferencias y compatibilidad

**Prioridad:** P1 · **Complejidad:** S/M · **Tipo:** productividad

**Historia de usuario**  
Como desarrollador, quiero compartir o adjuntar un informe de compatibilidad a una revisión de cambios sin tener que explicar manualmente todos los hallazgos.

**Criterios de aceptación**
1. El informe puede exportarse al menos en Markdown y JSON.
2. Incluye identificadores/nombres de las dos definiciones, fecha de generación, versión del analizador y resumen por severidad.
3. Cada hallazgo conserva su código, explicación y ubicación.
4. La exportación no incluye secretos de entornos ni contenido ajeno al informe.
5. El formato JSON tiene estructura versionada y se documenta para su consumo desde automatizaciones futuras.

**Dependencias:** `CAAD-POST-101`, `CAAD-POST-102`.  
**Complejidad:** S/M.  
**Definición de terminado específica:** fixtures de exportación y prueba de que un informe sin hallazgos produce un resultado válido y claro.

---

## Hito 2 — Estándares de diseño por proyecto

### CAAD-POST-201 — Crear perfiles y reglas de diseño configurables

**Prioridad:** P1 · **Complejidad:** M · **Tipo:** funcionalidad central

**Historia de usuario**  
Como desarrollador o arquitecto, quiero definir las convenciones de diseño de mi equipo para que CAAD revise las APIs según las políticas acordadas y no solo según reglas genéricas.

**Alcance inicial**
- Separar validación de conformidad estructural, reglas de diseño integradas y reglas propias del proyecto.
- Permitir activar/desactivar reglas y ajustar su severidad cuando la regla lo admita.
- Guardar la configuración por proyecto con versión de esquema.
- Incluir un perfil recomendado inicial y permitir volver a valores predeterminados.

**Criterios de aceptación**
1. Cada regla tiene ID estable, descripción, severidad predeterminada y categoría documentada.
2. La configuración sobrevive al cierre y reapertura del proyecto.
3. Cambiar un perfil no modifica la definición OpenAPI por sí mismo.
4. Los diagnósticos indican si proceden de una comprobación estructural, una regla de diseño o una regla del proyecto.
5. Una regla desactivada deja de generar nuevos hallazgos, pero no oculta errores estructurales obligatorios que protejan la integridad del modelo.
6. Una configuración desconocida o de versión futura produce un error manejado, sin resetearla silenciosamente.
7. La interfaz permite inspeccionar la explicación de la regla y el motivo de su severidad.

**Reglas candidatas iniciales**
- Convenciones de nombres para rutas y `operationId`.
- Descripción requerida o longitud mínima configurable.
- Respuesta de error estándar recomendada.
- Paginación recomendada para operaciones que devuelven colecciones.
- Política de seguridad declarada por operación.
- Convenciones para códigos HTTP y media types.

Estas reglas son políticas de diseño, no errores universales del estándar. Deben presentarse como tales.

**Dependencias:** `CAAD-POST-001`, `CAAD-POST-002`.  
**Riesgos:** construir un lenguaje de reglas complejo demasiado pronto o confundir una recomendación con una obligación de OpenAPI.  
**Definición de terminado específica:** catálogo documentado, pruebas por regla y migración de configuración versionada.

### CAAD-POST-202 — Justificar excepciones a reglas

**Prioridad:** P2 · **Complejidad:** M · **Tipo:** gobernanza

**Historia de usuario**  
Como desarrollador, quiero marcar una regla como excepción en un elemento concreto y documentar la razón, para evitar que una decisión intencionada genere ruido en cada revisión.

**Criterios de aceptación**
1. El usuario puede suprimir un hallazgo de una regla configurable en un alcance definido —elemento u operación— y añadir una justificación.
2. La excepción no puede desactivar reglas de integridad críticas que impedirían construir una definición válida.
3. Las excepciones se conservan localmente y están visibles en una vista consultable.
4. Si cambia o desaparece el elemento al que aplica la excepción, CAAD informa de la excepción huérfana.
5. Los informes exportados distinguen hallazgos activos de hallazgos suprimidos con justificación.

**Dependencias:** `CAAD-POST-201`.  
**Riesgos:** usar las excepciones para ocultar problemas sistémicos.  
**Definición de terminado específica:** pruebas de alcance, persistencia y eliminación/cambio del elemento afectado.

---

## Hito 3 — Dependencias y refactorización segura

### CAAD-POST-301 — Explorar dependencias entre componentes

**Prioridad:** P1 · **Complejidad:** M · **Tipo:** productividad

**Historia de usuario**  
Como desarrollador, quiero ver qué operaciones y componentes dependen de un esquema para anticipar el impacto de modificarlo o eliminarlo.

**Criterios de aceptación**
1. Desde un esquema, puedo consultar las operaciones, respuestas, cuerpos y otros esquemas que lo referencian directa o indirectamente.
2. Las referencias indirectas se distinguen de las directas.
3. Los ciclos de referencias se detectan sin bloquear la interfaz ni entrar en recursión infinita.
4. La navegación permite abrir el elemento dependiente en el editor.
5. Los componentes sin referencias pueden identificarse como candidatos a limpieza, sin eliminarlos automáticamente.
6. La relación de dependencias se calcula a partir del modelo actual; no queda obsoleta tras una edición confirmada.

**Dependencias:** `CAAD-POST-001`, `CAAD-POST-002`.  
**Riesgos:** mostrar referencias incompletas si no se analiza alguna forma admitida del modelo OpenAPI.  
**Definición de terminado específica:** pruebas de grafo con referencias directas, indirectas, ausentes y cíclicas.

### CAAD-POST-302 — Renombrar esquemas con actualización de referencias

**Prioridad:** P2 · **Complejidad:** M · **Tipo:** refactorización

**Historia de usuario**  
Como desarrollador, quiero renombrar un esquema sin romper las referencias que dependen de él.

**Criterios de aceptación**
1. Antes de aplicar el cambio, CAAD muestra el nombre actual, el nuevo nombre y el número/listado de referencias afectadas.
2. Se rechazan nombres inválidos o duplicados según las reglas del modelo.
3. Si se confirma, las referencias internas afectadas se actualizan dentro de una única operación consistente.
4. Si el usuario cancela o falla la operación, la definición permanece sin cambios parciales.
5. Después del cambio se ejecuta la validación y no quedan referencias rotas causadas por la refactorización.
6. El resultado se puede deshacer mientras exista una operación de undo soportada; si todavía no existe, la función debe confiar en una transacción completa y dejar clara la limitación.

**Alcance excluido inicialmente:** renombrado global de propiedades arbitrarias dentro de textos libres, descripciones, scripts externos o ejemplos que no estén representados como referencias tipadas.

**Dependencias:** `CAAD-POST-301`.  
**Riesgos:** actualizar solo algunas representaciones de una referencia o alterar texto que no debería modificarse.  
**Definición de terminado específica:** pruebas de atomicidad, duplicados, referencias múltiples y cancelación.

---

## Hito 4 — Ejemplos JSON

### CAAD-POST-401 — Validar ejemplos JSON contra esquemas

**Prioridad:** P1 · **Complejidad:** M · **Tipo:** productividad/calidad

**Historia de usuario**  
Como desarrollador, quiero validar un ejemplo de solicitud o respuesta contra su esquema para detectar inconsistencias antes de compartir la documentación o comenzar la implementación.

**Criterios de aceptación**
1. El usuario puede escribir, pegar o cargar un ejemplo JSON para validarlo contra un esquema elegido.
2. Los errores identifican la ruta de la propiedad afectada y explican la restricción incumplida.
3. Se comprueban las restricciones soportadas por el validador que realmente utiliza CAAD, incluyendo tipos, propiedades obligatorias, enumeraciones, referencias y restricciones numéricas o de longitud implementadas.
4. Si una palabra clave o construcción no está soportada, CAAD lo distingue de un ejemplo inválido.
5. La validación de ejemplos reutiliza una implementación coherente con la semántica JSON Schema/OpenAPI soportada; no duplica reglas de forma ad hoc en el frontend.
6. Los ejemplos inválidos no se descartan al cambiar de vista sin aviso.

**Dependencias:** `CAAD-POST-001`, `CAAD-POST-002`.  
**Riesgos:** validar de manera distinta a la usada para importar/exportar OpenAPI; indicar falsamente que un ejemplo es válido.  
**Definición de terminado específica:** pruebas para ejemplos correctos/incorrectos, referencias y restricciones límite; limitaciones documentadas.

### CAAD-POST-402 — Generar ejemplos JSON desde esquemas

**Prioridad:** P2 · **Complejidad:** M/L · **Tipo:** productividad

**Historia de usuario**  
Como desarrollador, quiero obtener un ejemplo inicial a partir de un esquema para no tener que construir manualmente cada solicitud y respuesta.

**Criterios de aceptación**
1. CAAD puede producir un ejemplo para los tipos básicos y las restricciones que declara soportar.
2. Respeta propiedades obligatorias, enumeraciones y restricciones simples cuando sea posible.
3. El generador tiene límites de profundidad y tamaño para manejar referencias circulares y esquemas recursivos.
4. Si no puede producir un ejemplo válido para una construcción determinada, indica la razón y no genera un ejemplo presentándolo como válido.
5. El usuario puede editar el resultado y guardarlo como ejemplo de la operación, cuerpo o respuesta correspondiente.
6. La generación es reproducible cuando se ejecuta con la misma configuración; si se incorpora aleatoriedad, debe ser optativa y controlable.
7. Los ejemplos generados se pueden ejecutar contra `CAAD-POST-401` para confirmar su validez.

**Dependencias:** `CAAD-POST-401`.  
**Riesgos:** generar valores semánticamente engañosos o ejemplos que incumplan restricciones combinadas.  
**Definición de terminado específica:** pruebas por tipo y restricciones soportadas, con casos de esquemas recursivos y límites.

---

## Hito 5 — Historial local y recuperación

### CAAD-POST-501 — Crear historial de revisiones del proyecto

**Prioridad:** P2 · **Complejidad:** M/L · **Tipo:** fiabilidad/productividad

**Historia de usuario**  
Como desarrollador, quiero guardar revisiones nombradas de una API y recuperar una anterior para experimentar con el diseño sin perder un estado conocido.

**Alcance inicial**
- Revisiones locales manuales con nombre/nota y fecha.
- Restauración mediante confirmación explícita.
- Comparación entre revisiones reutilizando `CAAD-POST-101`.
- Política sencilla para evitar crecimiento de almacenamiento descontrolado, documentando las decisiones.

**Criterios de aceptación**
1. El usuario puede crear una revisión nombrada sin duplicar el proyecto completo como un proyecto independiente visible.
2. Cada revisión conserva una definición recuperable y la versión del esquema interno necesaria para leerla.
3. El usuario puede comparar dos revisiones y restaurar una mediante una acción explícita.
4. Restaurar no elimina la revisión actual; crea o conserva un punto de recuperación antes de reemplazar el contenido activo.
5. Si una migración no puede leer una revisión antigua, CAAD la conserva y muestra un error controlado en lugar de descartarla.
6. Las revisiones sobreviven al cierre y reapertura de la aplicación.
7. Las operaciones de persistencia son transaccionales y los fallos se muestran al usuario.

**Dependencias:** `CAAD-POST-001`, `CAAD-POST-002`; reutiliza `CAAD-POST-101` para comparar.  
**Riesgos:** corrupción de datos o restauración accidental.  
**Definición de terminado específica:** migraciones, pruebas de recuperación y escenarios de error de escritura.

---

## Hito 6 — Servidor mock local

### CAAD-POST-601 — Ejecutar un servidor mock local desde OpenAPI

**Prioridad:** P2 · **Complejidad:** L · **Tipo:** ejecución local

**Historia de usuario**  
Como desarrollador frontend o integrador, quiero ejecutar una versión simulada de la API para trabajar antes de que el backend real esté disponible.

**Criterios de aceptación**
1. El usuario puede iniciar y detener el servidor mock desde CAAD y ver el estado real del servidor.
2. El servidor usa por defecto una dirección de loopback/localhost y un puerto seleccionable o asignado de manera segura.
3. Las rutas y métodos se resuelven a partir del contrato vigente, teniendo en cuenta las prioridades de coincidencia de rutas definidas por la implementación.
4. Para una operación, el servidor devuelve un ejemplo seleccionado o una respuesta simulada coherente con el código HTTP y media type configurados.
5. Los parámetros de ruta se reconocen sin confundir rutas estáticas con rutas parametrizadas.
6. Una definición inválida o insuficiente produce un informe claro de qué impide iniciar el mock.
7. El servidor no ejecuta código de usuario ni realiza llamadas salientes en nombre del usuario.
8. No se cambia silenciosamente el contrato para hacerlo ejecutable.
9. El usuario recibe errores claros si el puerto está ocupado o el servidor no puede iniciar.

**Dependencias:** `CAAD-POST-002`, idealmente `CAAD-POST-401` y `402`.  
**Riesgos:** conflictos de rutas, exposición accidental a la red local y divergencias entre el mock y el contrato.  
**Definición de terminado específica:** pruebas de rutas, métodos, errores de inicio, parada y escucha exclusiva en localhost por defecto.

### CAAD-POST-602 — Configurar respuestas y escenarios del mock

**Prioridad:** P2 · **Complejidad:** M · **Tipo:** productividad

**Historia de usuario**  
Como desarrollador, quiero escoger distintos ejemplos, códigos HTTP y respuestas por operación para simular escenarios útiles de integración.

**Criterios de aceptación**
1. El usuario puede seleccionar un ejemplo y código de respuesta disponibles en la definición.
2. Puede configurar una respuesta por defecto para operaciones que no tengan un ejemplo seleccionado.
3. Se pueden representar, como mínimo, escenarios de éxito y errores comunes documentados en el contrato.
4. La configuración mock se guarda separada del contenido estándar OpenAPI cuando corresponda, para no contaminar la especificación con metadatos privados de CAAD.
5. La interfaz diferencia claramente una respuesta simulada de una respuesta procedente de un backend real.

**Dependencias:** `CAAD-POST-601`, `CAAD-POST-401`.  
**Riesgos:** acoplar configuración exclusiva de CAAD al contrato exportado.  
**Definición de terminado específica:** pruebas de persistencia y selección de respuestas por operación.

---

## Hito 7 — Pruebas de conformidad contra una API real

### CAAD-POST-701 — Ejecutar verificaciones de contrato contra un servidor

**Prioridad:** P3 · **Complejidad:** L · **Tipo:** pruebas HTTP

**Historia de usuario**  
Como desarrollador backend, quiero verificar que una API ejecutándose en un entorno de desarrollo cumple el contrato diseñado en CAAD.

**Alcance inicial**
- URL base por entorno.
- Selección explícita de operaciones para probar.
- Construcción de solicitudes con parámetros y ejemplos definidos en el contrato.
- Validación de código HTTP, media type y cuerpo de respuesta frente al esquema documentado.
- Informe de resultados por operación.

**Criterios de aceptación**
1. El usuario configura el servidor objetivo de forma explícita; CAAD no ejecuta solicitudes contra un host desconocido sin confirmación.
2. Las solicitudes enviadas y sus destinos se pueden revisar antes de ejecutar una prueba o dentro de un panel de resultados comprensible.
3. El resultado distingue fallos de transporte, código HTTP inesperado, media type incompatible y error de validación del cuerpo.
4. Las respuestas se validan contra los esquemas admitidos por CAAD y se informan sus limitaciones.
5. Las credenciales no se almacenan en texto plano en SQLite ni en logs. Si se incorporan credenciales persistentes, se debe usar almacenamiento seguro del sistema operativo o mantenerlas solo durante la sesión hasta que esa capacidad esté disponible.
6. Se aplican límites de tiempo y tamaño de respuesta; la interfaz permite cancelar una ejecución cuando sea técnicamente posible.
7. No se afirma que una API completa cumple el contrato por haber probado solo un subconjunto de operaciones.

**Dependencias:** `CAAD-POST-401`; diseño explícito de seguridad y tratamiento de secretos.  
**Riesgos:** efectos secundarios en endpoints, exposición de credenciales y falsa confianza por cobertura de pruebas limitada.  
**Definición de terminado específica:** pruebas con servidor de prueba controlado, timeouts, respuestas inválidas y errores de conexión.

---

## Hito 8 — Herramientas para el flujo diario de desarrollo

### CAAD-POST-801 — Generar snippets de consumo por operación

**Prioridad:** P3 · **Complejidad:** M · **Tipo:** productividad

**Historia de usuario**  
Como desarrollador consumidor de la API, quiero generar un ejemplo de solicitud para integrar una operación sin reconstruir manualmente URL, cabeceras y cuerpo.

**Alcance inicial recomendado:** `curl` y `fetch` de TypeScript. Otros lenguajes pueden incorporarse después.

**Criterios de aceptación**
1. El snippet utiliza el servidor, método, parámetros, media type y ejemplo definidos en la operación seleccionada.
2. Los valores de ejemplo se distinguen de credenciales reales.
3. Los parámetros de ruta y consulta se codifican correctamente; el cuerpo JSON se serializa con formato válido.
4. Si un campo necesario no está definido, CAAD utiliza un marcador explícito o informa de lo que falta, sin inventar secretos ni valores de producción.
5. El snippet se puede copiar al portapapeles y se puede consultar su lenguaje de destino.

**Dependencias:** `CAAD-POST-401`; puede aprovechar `CAAD-POST-402`.  
**Riesgos:** generar código incompleto o enseñar una forma incorrecta de codificar parámetros.  
**Definición de terminado específica:** pruebas con rutas parametrizadas, query params, cabeceras y cuerpos JSON.

### CAAD-POST-802 — Crear un ejecutable de validación sin interfaz (CLI)

**Prioridad:** P3 · **Complejidad:** L · **Tipo:** automatización/arquitectura

**Historia de usuario**  
Como desarrollador, quiero validar un archivo OpenAPI desde la terminal para ejecutar las mismas comprobaciones en scripts locales y pipelines de integración continua.

**Alcance inicial**
- Comando `validate` que reutilice el dominio y los validadores de CAAD.
- Entrada por ruta de archivo JSON/YAML compatible.
- Selección de perfil de reglas cuando exista `CAAD-POST-201`.
- Salida legible para humanos y salida estructurada JSON.
- Código de salida distinto de cero ante errores bloqueantes.

**Criterios de aceptación**
1. El comando se ejecuta sin abrir la interfaz gráfica.
2. Reutiliza la misma implementación de validación que CAAD desktop; no se crea un segundo motor con resultados divergentes.
3. La salida incluye códigos estables, severidad, ubicación y resumen.
4. Los errores de lectura, sintaxis, esquema no soportado y fallos de validación se distinguen cuando sea posible.
5. Los códigos de salida están documentados y cuentan con pruebas de integración.
6. La CLI no modifica el archivo de entrada.
7. Si la extracción del dominio a una biblioteca compartida requiere cambios arquitectónicos, se documentan y prueban en un ADR antes de implementarlos.

**Dependencias:** `CAAD-POST-001`, `CAAD-POST-002`, `CAAD-POST-201`.  
**Riesgos:** duplicar lógica del dominio o ampliar permisos del proceso innecesariamente.  
**Definición de terminado específica:** pruebas de CLI que comprueben salida, código de salida y que el archivo original no cambia.

### CAAD-POST-803 — Documentar e integrar CAAD en un pipeline CI

**Prioridad:** P3 · **Complejidad:** M/L · **Tipo:** integración

**Historia de usuario**  
Como equipo de desarrollo, quiero ejecutar la validación del contrato dentro del pipeline para detectar errores antes de fusionar cambios.

**Criterios de aceptación**
1. El repositorio de CAAD incluye al menos un ejemplo funcional de pipeline que ejecuta la CLI de validación sobre un archivo versionado.
2. La documentación explica cómo ajustar la ruta del contrato, el perfil y las reglas.
3. Un error bloqueante de validación provoca el fallo del paso de CI según los códigos de salida documentados.
4. El ejemplo distingue validación de OpenAPI y políticas de diseño propias de CAAD.
5. El pipeline de ejemplo no requiere cargar el contrato a un servicio externo.

**Dependencias:** `CAAD-POST-802`, `CAAD-POST-201`.  
**Riesgos:** prometer soporte oficial de plataformas de CI que no se hayan probado.  
**Definición de terminado específica:** al menos un pipeline de referencia probado y el resto identificado como ejemplos adaptables, si no se verifican.

---

## Hito 9 — Asistencia inteligente controlada

### CAAD-POST-901 — Proponer operaciones y esquemas a partir de requisitos

**Prioridad:** P4 · **Complejidad:** L · **Tipo:** IA opcional

**Historia de usuario**  
Como desarrollador, quiero describir en lenguaje natural una necesidad y recibir una propuesta estructurada de operaciones, parámetros, esquemas y respuestas que pueda revisar dentro de CAAD.

**Criterios de aceptación**
1. La funcionalidad es opcional y está aislada del flujo determinista de diseño y validación.
2. El usuario sabe qué proveedor se invocará y qué contenido se enviará antes de compartir información del proyecto.
3. La respuesta se transforma a una propuesta estructurada; no se ejecuta como código ni se aplica directamente a la definición activa.
4. La propuesta se muestra como un diff revisable y cada parte puede aceptarse o rechazarse según el diseño de la interacción.
5. CAAD ejecuta sus validaciones locales sobre la propuesta antes de permitir incorporarla.
6. Los fallos del proveedor, respuestas malformadas y límites de uso no dañan el proyecto actual.
7. No se almacenan claves API en texto plano en la base de datos del proyecto ni se incluyen en logs.
8. Las funciones centrales siguen disponibles cuando no hay conexión o no hay proveedor configurado.

**Dependencias:** `CAAD-POST-101`, `CAAD-POST-201` y modelo de propuesta estructurada revisado.  
**Riesgos:** fuga involuntaria de contratos, cambios incorrectos y dependencia excesiva de IA.  
**Definición de terminado específica:** pruebas con proveedor simulado, rechazo de respuesta inválida, revisión de privacidad y documentación de datos enviados.

### CAAD-POST-902 — Generar esquemas desde muestras JSON con asistencia opcional

**Prioridad:** P4 · **Complejidad:** M/L · **Tipo:** productividad/IA opcional

**Historia de usuario**  
Como desarrollador, quiero importar una muestra JSON y obtener una propuesta de esquema, pudiendo revisar qué restricciones son inferidas y cuáles no pueden deducirse de una sola muestra.

**Criterios de aceptación**
1. CAAD genera o propone un esquema sin afirmar que una única muestra revela todas las reglas del dominio.
2. Los campos inferidos, la obligatoriedad y los formatos sugeridos se pueden revisar y editar.
3. Se distinguen propiedades observadas de inferencias heurísticas o propuestas de IA.
4. El resultado se valida con las reglas locales y se incorpora solo tras confirmación.
5. La funcionalidad explica si la muestra se procesa localmente o se envía a un proveedor externo.

**Dependencias:** `CAAD-POST-401`, `CAAD-POST-901` si se utiliza proveedor de IA.  
**Riesgos:** inferir obligatoriedad o semántica de negocio a partir de evidencia insuficiente.  
**Definición de terminado específica:** fixtures de muestras simples, heterogéneas, anidadas y con valores nulos.

---

# 6. Orden sugerido para las primeras iteraciones

Este orden permite comenzar con funcionalidades útiles sin abordar desde el principio un servidor HTTP, ejecución de procesos externos o integración con IA.

1. **Iteración A — Baseline:** `CAAD-POST-001` y `CAAD-POST-002`.
2. **Iteración B — Comparación:** `CAAD-POST-101`, con una primera versión acotada a elementos bien representados por el modelo actual.
3. **Iteración C — Compatibilidad:** `CAAD-POST-102` y luego `CAAD-POST-103`.
4. **Iteración D — Reglas por proyecto:** `CAAD-POST-201`; mantener separadas las reglas estructurales obligatorias de las convenciones configurables.
5. **Iteración E — Utilidad del diseño:** `CAAD-POST-301` y `CAAD-POST-401`.
6. **Iteración F — Mejoras de edición:** `CAAD-POST-302`, `CAAD-POST-402` y `CAAD-POST-202`.
7. **Iteración G — Revisiones locales:** `CAAD-POST-501`.
8. **Iteración H — Mock:** `CAAD-POST-601` y `CAAD-POST-602`.
9. **Iteración I — Integración:** `CAAD-POST-801`, `CAAD-POST-802` y `CAAD-POST-803`.
10. **Iteración J — Pruebas reales e IA:** `CAAD-POST-701`, `CAAD-POST-901` y `CAAD-POST-902`, según capacidad y necesidad validadas.

No es obligatorio mantener iteraciones de tamaño uniforme. Cada una debe acabar con una versión funcional, pruebas ejecutadas y documentación actualizada.

# 7. Definición de listo (*Definition of Ready*)

Una historia puede comenzar cuando:

- El repositorio y los módulos afectados ya fueron inspeccionados.
- El objetivo y los criterios de aceptación están suficientemente definidos.
- Se conocen las dependencias y se han identificado los riesgos relevantes.
- Se sabe qué pruebas demostrarán el comportamiento esperado.
- Los cambios de arquitectura necesarios se han propuesto en un ADR cuando corresponda.
- Se ha comprobado que la historia no duplica una capacidad ya existente.

# 8. Definición de terminado (*Definition of Done*)

Una historia no se considera terminada hasta cumplir los puntos aplicables:

1. Los criterios de aceptación se cumplen y pueden demostrarse.
2. Las reglas de negocio se implementan en la capa de dominio/aplicación apropiada, sin duplicarlas en frontend.
3. Se añadieron pruebas unitarias, de integración o de interfaz según el alcance.
4. Se ejecutaron y reportaron los comandos relevantes de formato, lint, pruebas y build; no se declara éxito sin revisar su resultado real.
5. Los errores externos y las entradas no confiables se manejan sin pérdida silenciosa de datos.
6. Se mantiene la seguridad de las operaciones de archivo, red y secretos.
7. Se actualizó la documentación pertinente: README, arquitectura, modelo de datos, reglas, compatibilidad, ADR o hitos.
8. Se actualizaron las migraciones si cambió el formato persistido y se probaron con proyectos existentes.
9. Se revisó la interoperabilidad OpenAPI y se documentaron las construcciones no soportadas.
10. La funcionalidad deja una versión compilable y ejecutable, o los bloqueos están documentados con precisión.

# 9. Riesgos transversales a controlar

| Riesgo | Mitigación exigida en el backlog |
|---|---|
| Clasificar incorrectamente un cambio como compatible | Reglas versionadas, contexto solicitud/respuesta, categoría de incertidumbre y pruebas. |
| Perder información en importación, migración o refactorización | Operaciones transaccionales, diffs previos, respaldo y pruebas de ida y vuelta. |
| Duplicar reglas entre Rust y frontend | Dominio como única fuente de verdad y pruebas de integración. |
| Tratar recomendaciones de estilo como errores del estándar | Categorías y mensajes diferenciados. |
| Exponer un mock en la red accidentalmente | Escucha en localhost por defecto; cualquier exposición adicional requiere configuración explícita. |
| Guardar credenciales en texto plano | No incluir secretos en SQLite/logs; definir almacenamiento seguro antes de persistirlos. |
| Dar falsa confianza con pruebas HTTP parciales | Informar el alcance probado y no declarar conformidad total por muestreo. |
| Enviar un contrato a una IA sin consentimiento | Proveedor y datos visibles; autorización previa; propuesta no aplicada automáticamente. |
| Sobrecargar el alcance antes de validar el valor | Hitos pequeños, decisiones registradas y priorización basada en uso real. |

# 10. Decisiones que deben confirmarse durante la implementación

No bloquean el inicio del backlog, pero necesitan una decisión documentada antes de implementar la funcionalidad correspondiente:

1. **Comparación:** definir el subconjunto exacto de OpenAPI que puede compararse semánticamente y cómo informar los límites.
2. **Compatibilidad:** definir políticas por defecto y separar compatibilidad del consumidor, del proveedor y de convenciones internas cuando resulte pertinente.
3. **Reglas:** decidir el formato interno de configuración y si se permite importar/exportar perfiles fuera de CAAD.
4. **Historial:** elegir una representación de revisiones que preserve datos antiguos sin acoplarse indebidamente a SQLite.
5. **Mock server:** seleccionar la implementación HTTP compatible con el runtime Tauri/Rust y definir la resolución de rutas ambiguas.
6. **Conformidad HTTP:** acordar timeouts, límites, tratamiento de redirecciones, credenciales y confirmación de solicitudes con efectos secundarios.
7. **CLI:** decidir cómo empaquetar el ejecutable y compartir el dominio sin duplicar código ni permisos de la aplicación desktop.
8. **IA:** definir proveedores permitidos, tratamiento de claves, advertencia de privacidad y estructura de propuestas.

Cada decisión que implique dependencias, cambios arquitectónicos o riesgos importantes debe registrarse en `docs/ADR/` antes de consolidar la implementación.

# 11. Primera tarea lista para entregar a un agente de programación

El siguiente prompt está diseñado para iniciar el desarrollo sin pedir al agente que implemente varias historias de una vez.

> **Tarea:** Implementar `CAAD-POST-001 — Verificar la base real y registrar el baseline post-MVP`.
>
> Lee `PROJECT_SPECS.md` y este backlog completo. Inspecciona el repositorio y el entorno real antes de proponer cambios. No reconstruyas ni refactorices el MVP de forma preventiva. Determina qué capacidades están implementadas, cuáles están parcialmente implementadas y qué comprobaciones pueden ejecutarse.
>
> Ejecuta las pruebas, checks de formato, lint y builds que estén configurados y sean pertinentes. Registra únicamente resultados observados; no afirmes que un comando pasó si no se ejecutó. Revisa especialmente el modelo de dominio, el flujo de importación/exportación OpenAPI, el sistema de diagnósticos, la persistencia y la cobertura de pruebas.
>
> Crea un informe en `docs/milestones/POST_MVP_BASELINE.md` (o la ubicación equivalente que ya utilice el repositorio) con: capacidades confirmadas, comandos ejecutados y resultados, limitaciones conocidas, diferencias entre código y especificación, módulos que deben reutilizarse para el comparador y las reglas, y riesgos que deban resolverse antes de nuevas funciones.
>
> No implementes todavía `CAAD-POST-101` ni ninguna otra funcionalidad nueva. Si detectas un defecto bloqueante, descríbelo y propón el cambio mínimo; no realices una reestructuración amplia sin justificación y pruebas.
>
> **Criterio de cierre:** el informe permite decidir dónde y cómo implementar `CAAD-POST-101` sin duplicar la lógica de dominio existente. Actualiza la documentación que realmente esté desactualizada y reporta los archivos modificados, comandos ejecutados, resultados y limitaciones.

---

## 12. Criterio de éxito del roadmap

El roadmap estará generando valor cuando un desarrollador pueda, como mínimo:

1. Diseñar una API y mantener sus reglas de equipo en CAAD.
2. Comparar el contrato con una versión anterior y entender los cambios relevantes.
3. Detectar incompatibilidades potenciales antes de publicar.
4. Entender el impacto de cambios en esquemas y refactorizarlos con seguridad.
5. Crear y validar ejemplos que frontend y backend puedan utilizar.
6. Ejecutar un mock local mientras se implementa el backend.
7. Finalmente, automatizar las mismas verificaciones y comprobar respuestas de una API real cuando esas capacidades estén disponibles.

La prioridad no es acumular funciones, sino mantener una cadena de confianza: **definición estructurada → análisis reproducible → cambio revisable → pruebas verificables → integración en el flujo de desarrollo**.
