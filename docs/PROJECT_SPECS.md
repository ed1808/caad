# CAAD — Documento maestro del producto y guía de desarrollo

**Nombre de trabajo:** CAAD (*Computer Assisted API Design*)  
**Tipo de aplicación:** Desktop, local-first  
**Estado:** Borrador inicial para validar durante el desarrollo  
**Versión del documento:** 0.1  
**Audiencia:** Desarrollador responsable y agente de programación basado en IA

---

## 0. Cómo utilizar este documento

Este documento es la fuente inicial de contexto del proyecto. Debe acompañar al repositorio y actualizarse cuando se tome una decisión relevante.

El agente de IA debe:

1. Leer este documento completo antes de realizar cambios en el repositorio.
2. Trabajar por hitos pequeños y verificables; no intentar implementar todo el producto en una sola iteración.
3. Examinar el estado real del repositorio antes de proponer comandos o modificar archivos.
4. Separar las decisiones confirmadas de las propuestas que todavía requieran validación.
5. Ejecutar las pruebas y comprobaciones pertinentes después de cada cambio y reportar los comandos ejecutados y sus resultados reales.
6. Actualizar la documentación cuando una decisión arquitectónica o funcional cambie.
7. No declarar una funcionalidad terminada si no existe una prueba razonable que demuestre su funcionamiento.

Cuando el agente detecte una ambigüedad que no bloquee el trabajo, debe elegir la alternativa más sencilla que respete este documento, documentar la decisión y continuar. Si la ambigüedad puede provocar pérdida de datos, una ruptura arquitectónica importante o una incompatibilidad relevante, debe detener ese cambio concreto y presentar las opciones con sus consecuencias.

Este documento define la visión y el alcance iniciales. No sustituye los detalles de implementación que se documenten en las historias de trabajo, ADR (*Architecture Decision Records*) y pruebas.

## 1. Resumen ejecutivo

CAAD será una aplicación de escritorio que ayude a diseñadores y desarrolladores a definir, revisar, validar y exportar contratos de APIs HTTP REST antes de implementar la lógica de backend.

El usuario podrá crear un proyecto, modelar esquemas de datos, diseñar operaciones HTTP, definir parámetros y respuestas, reutilizar componentes y revisar observaciones de diseño. La aplicación generará y consumirá especificaciones OpenAPI dentro del alcance de compatibilidad soportado.

**CAAD no será, en su primera versión, un generador integral de backends, una plataforma de despliegue, un cliente de pruebas HTTP ni un servicio web colaborativo.** Su responsabilidad principal será el diseño del contrato y la asistencia durante ese proceso.

### 1.1 Problema que resuelve

El diseño de una API implica decisiones relacionadas entre sí: rutas, métodos HTTP, parámetros, cuerpos, modelos, respuestas, errores, convenciones y seguridad. Las inconsistencias pueden pasar inadvertidas cuando esos elementos se definen por separado y descubrirse tarde, durante la integración o la implementación.

CAAD debe permitir detectar problemas estructurales y de consistencia mientras el diseño todavía se está construyendo. Debe explicar cada observación y, cuando sea viable, ofrecer una corrección que el usuario pueda revisar y aceptar.

### 1.2 Propuesta de valor

> Diseñar contratos de API de forma visual y asistida, con validación comprensible y una representación coherente del diseño, antes de comenzar a programar el backend.

### 1.3 Objetivos del MVP

- Crear y editar proyectos de diseño de API en un entorno desktop.
- Definir esquemas reutilizables y operaciones HTTP REST.
- Mantener sincronizada la edición con formularios y la representación interna del diseño.
- Validar reglas estructurales y de consistencia.
- Mostrar observaciones que enlacen con el elemento del diseño que las origina.
- Importar y exportar documentos OpenAPI dentro de un subconjunto definido y probado.
- Guardar los proyectos localmente y reducir el riesgo de pérdida de trabajo.

### 1.4 No objetivos del MVP

- Ejecutar código de usuario o alojar APIs.
- Generar un backend de producción.
- Gestionar bases de datos de la API diseñada.
- Proporcionar un cliente completo de solicitudes HTTP como Postman.
- Sincronizar proyectos mediante una cuenta en la nube.
- Ofrecer colaboración multiusuario en tiempo real.
- Soportar desde el inicio REST, GraphQL, gRPC y APIs orientadas a eventos.
- Depender obligatoriamente de IA generativa para que funcionen las funciones principales.

## 2. Usuarios y principios de producto

### 2.1 Usuario principal

Desarrollador backend que necesita diseñar una API nueva o revisar un contrato existente antes de implementar sus endpoints.

### 2.2 Usuarios secundarios

- Arquitecto de software que revisa consistencia entre recursos y operaciones.
- Desarrollador frontend que necesita un contrato claro para integrar la API.
- Estudiante o desarrollador que quiere aprender convenciones de diseño HTTP.

### 2.3 Principios

1. **El usuario conserva el control.** Las sugerencias importantes requieren aceptación explícita.
2. **Validación reproducible.** Una misma definición y conjunto de reglas deben producir los mismos diagnósticos, salvo que cambie la versión de las reglas.
3. **Explicar en vez de solo marcar.** Cada observación debe describir el problema, ubicación, impacto probable y alternativa recomendada cuando corresponda.
4. **Modelo interno como fuente de verdad.** La interfaz visual, la validación y la exportación derivan de una definición estructurada compartida.
5. **Sin pérdida silenciosa.** Las funciones de importación y exportación deben informar de características que no puedan representar fielmente.
6. **Local-first.** Los proyectos permanecen localmente; no se requieren cuentas ni conexión de red para las funciones principales.
7. **Iteración incremental.** Cada hito debe dejar una versión compilable, ejecutable y comprobable.
8. **IA opcional.** El modelado, la persistencia, la validación determinista y la exportación deben funcionar sin proveedor externo de IA.

## 3. Decisiones técnicas de referencia

Estas son las decisiones iniciales recomendadas. Antes de fijar versiones concretas de herramientas y bibliotecas, el agente debe verificar la documentación y el estado de mantenimiento actuales, y registrar la selección final en un ADR.

### 3.1 Aplicación desktop

- **Shell de escritorio:** Tauri 2.
- **Lenguaje principal para dominio y lógica de aplicación:** Rust.
- **Frontend de escritorio:** React + TypeScript + Vite, servido como frontend estático dentro de Tauri.
- **Gestor de paquetes frontend:** Bun, sujeto a validar que las tareas de desarrollo, prueba y empaquetado funcionen de forma reproducible.
- **Persistencia local:** SQLite, accedida desde la capa Rust.
- **Serialización de modelos internos:** Serde y JSON.
- **Control de versiones:** Git.

### 3.2 Justificación de la arquitectura

Tauri permite construir una aplicación de escritorio con Rust para la lógica nativa y un frontend basado en HTML, CSS y JavaScript/TypeScript. Esta combinación se propone porque CAAD requiere formularios complejos, navegación entre recursos, documentación y paneles de diagnóstico. React ofrece un ecosistema adecuado para implementar esa interfaz, mientras que Rust mantiene el control del dominio, validación, persistencia y operaciones de archivo.

Rust debe seguir siendo responsable de las reglas de negocio y de las transformaciones críticas. El frontend puede administrar estado de presentación, selección actual, formularios temporales y navegación, pero no debe convertirse en una segunda implementación de las reglas de validación.

### 3.3 Alternativas de interfaz no seleccionadas inicialmente

Es posible construir interfaces desktop completamente en Rust con bibliotecas como Slint, egui o iced. No se eligen como base inicial porque el producto requerirá formularios elaborados y una experiencia de edición/documentación rica, para la cual un frontend web ofrece flexibilidad. No se debe reescribir la interfaz ni introducir un segundo toolkit sin una justificación y un ADR.

### 3.4 Contrato OpenAPI

- **Alcance inicial recomendado:** importar y exportar OpenAPI 3.1.x.
- Mantener el modelo interno independiente de las estructuras de una biblioteca OpenAPI concreta.
- Diseñar una capa de importación/exportación que pueda ampliarse a otras versiones.
- Evaluar OpenAPI 3.2.x como una mejora posterior o mediante una prueba de interoperabilidad antes de prometer soporte.
- No presentar como “validación completa de OpenAPI” una validación propia que solo compruebe un subconjunto.

La especificación oficial publica actualmente OpenAPI 3.2.1, pero una versión más reciente del estándar no garantiza que todas las bibliotecas y herramientas de terceros la soporten de forma equivalente. La versión objetivo debe priorizar compatibilidad demostrable, pruebas de ida y vuelta y comunicación transparente de limitaciones.

### 3.5 Bibliotecas y dependencias

El agente debe investigar las bibliotecas de Rust adecuadas para:

- parsear y serializar JSON y YAML;
- leer y escribir documentos OpenAPI compatibles con el objetivo del MVP;
- validar estructura OpenAPI y restricciones de esquemas;
- interactuar con SQLite y ejecutar migraciones;
- probar componentes de dominio.

No elegir una biblioteca solo por popularidad o por un ejemplo aislado. Comprobar mantenimiento, licencia, cobertura de OpenAPI 3.1, tratamiento de referencias, limitaciones conocidas y compatibilidad con la versión de Rust elegida. **No adoptar `serde_yaml` sin mantenimiento como dependencia nueva**; verificar una alternativa activa y documentar la decisión.

Evitar dependencias duplicadas que cumplan la misma responsabilidad. No fijar versiones arbitrarias sin comprobar las versiones estables actuales y sus requisitos.

## 4. Arquitectura lógica

La aplicación debe separarse en capas, al menos conceptualmente:

### 4.1 Frontend

Responsabilidades:

- presentar navegación, formularios y vistas;
- mantener la selección actual y estado transitorio de edición;
- invocar comandos explícitos de Tauri;
- mostrar resultados, errores y diagnósticos del backend;
- proporcionar vistas previas de la documentación;
- nunca acceder directamente a SQLite ni leer/escribir arbitrariamente el sistema de archivos.

### 4.2 Capa de comandos de Tauri

Responsabilidades:

- exponer una API IPC pequeña y tipada entre frontend y Rust;
- validar los argumentos externos;
- traducir errores de aplicación a resultados que el frontend pueda presentar;
- evitar comandos genéricos peligrosos como ejecutar rutas arbitrarias o aceptar operaciones de archivo sin restricciones.

### 4.3 Capa de aplicación

Responsabilidades:

- orquestar casos de uso como crear proyecto, añadir esquema, modificar operación, validar definición e importar/exportar OpenAPI;
- asegurar los límites transaccionales de persistencia;
- coordinar el dominio, validadores e importadores/exportadores.

### 4.4 Dominio

Responsabilidades:

- definir los tipos y reglas de los componentes de una API;
- validar invariantes independientes de la interfaz;
- representar operaciones, parámetros, esquemas, respuestas y referencias;
- calcular dependencias entre componentes;
- representar diagnósticos con identificadores estables y ubicación dentro del diseño.

El dominio no debe depender de React, Tauri, SQLite ni de un formato de archivo específico.

### 4.5 Infraestructura

Responsabilidades:

- persistencia SQLite;
- migraciones del almacenamiento;
- importación/exportación JSON/YAML OpenAPI;
- operaciones de archivo seguras;
- registro técnico de errores sin incluir contenido sensible del usuario de forma innecesaria.

### 4.6 Organización de repositorio sugerida

La estructura real puede ajustarse al scaffold oficial que se genere, pero debe preservar la separación de responsabilidades.

```text
caad/
├── README.md
├── CONTRIBUTING.md
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── VALIDATION_RULES.md
│   ├── ADR/
│   └── milestones/
├── src/                         # Frontend React + TypeScript
│   ├── app/
│   ├── features/
│   │   ├── projects/
│   │   ├── schemas/
│   │   ├── operations/
│   │   ├── validation/
│   │   └── documentation/
│   ├── components/
│   ├── lib/
│   └── tests/
├── src-tauri/                   # Aplicación y dominio Rust
│   ├── src/
│   │   ├── commands/
│   │   ├── application/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   └── lib.rs
│   ├── migrations/
│   └── Cargo.toml
├── package.json
└── bun.lock
```

No es obligatorio forzar cada módulo como crate separado en el primer hito. La separación lógica y las dependencias unidireccionales son más importantes que una fragmentación prematura.

## 5. Modelo de dominio inicial

El modelo siguiente es conceptual. No debe traducirse mecánicamente a tablas SQL ni acoplarse a estructuras de terceros sin analizar primero los casos de uso.

### 5.1 Project

Representa el proyecto local de diseño.

Campos conceptuales:

- `id`: identificador estable;
- `name`: nombre visible;
- `description`: descripción opcional;
- `created_at` y `updated_at`;
- `document`: definición estructurada actual;
- `document_schema_version`: versión del formato interno persistido.

Un proyecto contiene una API en el MVP. No se necesita soporte de monorepositorios o múltiples APIs por proyecto en la primera versión.

### 5.2 ApiDefinition

Metadatos y contenido principal del contrato:

- versión de OpenAPI utilizada para importar/exportar;
- `title`, `summary`/`description` y versión de la API;
- servidores configurados;
- tags;
- esquemas reutilizables;
- operaciones;
- esquemas básicos de seguridad, dentro del alcance definido;
- información de contacto/licencia como campos opcionales si la interfaz puede soportarlos sin complicar el flujo principal.

La versión de la API diseñada (`info.version`) no debe confundirse con la versión de OpenAPI (`openapi`).

### 5.3 SchemaDefinition

Representa un esquema reutilizable de datos.

El MVP debe contemplar, como mínimo:

- tipos `string`, `integer`, `number`, `boolean`, `object` y `array`;
- propiedades de objeto y lista de propiedades obligatorias;
- arrays con definición de `items`;
- referencias a esquemas internos reutilizables mediante `$ref`;
- descripción y ejemplos cuando sean aplicables;
- valores enumerados;
- restricciones comunes como mínimos/máximos numéricos, longitud mínima/máxima, patrón y restricciones de tamaño de arrays;
- formatos comunes como `date`, `date-time`, `email` y `uuid`, sin asumir que cada `format` siempre implica validación estricta.

Debe diseñarse una representación adecuada de los tipos compatibles con OpenAPI 3.1 y JSON Schema. No asumir que `nullable` de OpenAPI 3.0 se representa de la misma manera en OpenAPI 3.1.

### 5.4 Operation

Representa una operación HTTP en una ruta.

Campos conceptuales:

- ruta, por ejemplo `/vehicles/{vehicleId}`;
- método HTTP;
- `operationId` opcional, pero único si se define;
- resumen y descripción;
- tags;
- parámetros de ruta, consulta, cabecera y cookie;
- cuerpo de solicitud opcional;
- una o más respuestas con códigos HTTP;
- requisitos de seguridad, si aplica;
- indicador `deprecated` cuando sea necesario.

### 5.5 Parameter

Debe incluir nombre, ubicación (`path`, `query`, `header`, `cookie`), descripción, obligatoriedad y esquema. Los parámetros de ruta deben estar marcados como obligatorios conforme a OpenAPI.

### 5.6 RequestBody y Response

Cada cuerpo define descripción opcional, obligatoriedad cuando aplique, tipos de contenido y esquema. Cada respuesta incluye un código o respuesta por defecto, descripción y contenido opcional. En el MVP se priorizará `application/json`; otros media types deben ser posibles cuando no aumenten significativamente la complejidad.

### 5.7 DesignIssue

Representa una observación producida por un validador:

- `id` estable dentro de una ejecución o regla;
- `rule_id`;
- severidad: `error`, `warning` o `suggestion`;
- título y explicación;
- ubicación del elemento afectado;
- recomendación opcional;
- acción automatizable opcional, solo si se puede aplicar de forma segura.

Las observaciones pueden calcularse a partir del documento. No es necesario persistirlas como datos permanentes en la primera versión; deben recalcularse cuando cambia la definición o las reglas.

### 5.8 Persistencia recomendada para el MVP

Usar SQLite con una tabla `projects` que almacene metadatos y la representación JSON del documento de diseño. Este enfoque de documento completo reduce complejidad durante la primera etapa. Incluir `document_schema_version` para evolucionar el formato interno de manera controlada.

La persistencia debe:

- ejecutarse desde Rust;
- usar transacciones para guardar documentos completos;
- aplicar migraciones versionadas a SQLite;
- soportar guardado automático con indicador visible;
- evitar escribir en cada pulsación de tecla sin control; se permite debounce o guardado por cambios confirmados;
- conservar el último documento válido en caso de error al guardar;
- mostrar errores de persistencia sin descartar silenciosamente el estado editado.

La normalización en múltiples tablas, historial de revisiones y sincronización remota quedan fuera del MVP salvo que una prueba de concepto revele una necesidad real.

## 6. Alcance funcional del MVP

### FR-001 — Crear un proyecto

El usuario puede crear un proyecto con nombre y descripción opcional.

**Criterios de aceptación:**

- el nombre no puede estar vacío después de eliminar espacios externos;
- al crear el proyecto se inicializa una definición de API válida como borrador;
- el proyecto aparece en la vista de proyectos;
- al cerrar y volver a abrir la aplicación, el proyecto continúa disponible.

### FR-002 — Listar, abrir, renombrar y eliminar proyectos

**Criterios de aceptación:**

- los proyectos se muestran con nombre y fecha de última modificación;
- abrir un proyecto carga su documento persistido;
- eliminar requiere confirmación explícita;
- un error de base de datos no se presenta como eliminación exitosa.

### FR-003 — Editar metadatos de API

El usuario puede definir título, descripción, versión de la API y servidores.

**Criterios de aceptación:**

- los cambios se reflejan en la vista previa y en la exportación;
- se distingue claramente la versión de la API de la versión de OpenAPI;
- los campos incompletos producen diagnósticos cuando lo exija el contrato.

### FR-004 — Crear y editar esquemas reutilizables

**Criterios de aceptación:**

- un esquema tiene un nombre único dentro de `components/schemas`;
- el usuario puede añadir, modificar y eliminar propiedades;
- se admiten los tipos básicos definidos en el apartado 5.3;
- las referencias se seleccionan entre los esquemas internos existentes;
- no se permite eliminar silenciosamente un esquema que aún está referenciado; la aplicación debe mostrar las dependencias y exigir una decisión explícita.

### FR-005 — Crear y editar operaciones

**Criterios de aceptación:**

- el usuario puede definir ruta y método HTTP;
- el sistema distingue método y ruta como clave de operación;
- se pueden configurar `operationId`, resumen, descripción y tags;
- se impiden duplicados exactos de método/ruta;
- el diseñador muestra las operaciones ordenadas y agrupadas de manera comprensible.

### FR-006 — Definir parámetros

**Criterios de aceptación:**

- se soportan los parámetros `path`, `query`, `header` y `cookie`;
- cada parámetro tiene nombre, ubicación, esquema y obligatoriedad;
- todos los parámetros de ruta referidos en la plantilla de ruta deben estar definidos;
- todos los parámetros declarados como `path` deben aparecer en la plantilla de ruta y ser obligatorios;
- se detectan duplicados según las reglas aplicables de OpenAPI.

### FR-007 — Definir cuerpo de solicitud y respuestas

**Criterios de aceptación:**

- la operación puede no tener cuerpo de solicitud;
- el usuario puede definir un cuerpo con esquema y media type;
- se pueden definir varias respuestas por operación;
- cada respuesta tiene una descripción;
- se puede asociar un esquema reutilizable a una respuesta;
- el código HTTP y la estructura del contrato se validan según las reglas implementadas.

### FR-008 — Reutilizar componentes

**Criterios de aceptación:**

- esquemas y respuestas reutilizables pueden referenciarse desde varias operaciones;
- la interfaz identifica cuándo existe una referencia a un componente;
- las referencias internas rotas producen un error de validación;
- la resolución y análisis de referencias no debe bloquearse indefinidamente ante referencias circulares.

### FR-009 — Validación automática

**Criterios de aceptación:**

- las observaciones tienen severidad, título, explicación e ubicación;
- al seleccionar una observación, la interfaz navega al elemento relacionado cuando este sea editable;
- se diferencia entre error bloqueante, advertencia y sugerencia;
- las validaciones se ejecutan después de cambios confirmados o de forma incremental sin congelar la UI;
- la interfaz no declara que el contrato es válido si las comprobaciones obligatorias han fallado.

### FR-010 — Vista previa de documentación

**Criterios de aceptación:**

- la vista previa muestra metadatos, operaciones, parámetros, esquemas, solicitudes y respuestas;
- la vista previa refleja la definición actual, no un archivo obsoleto;
- las operaciones se pueden recorrer desde una navegación clara;
- los diagnósticos no desaparecen solo por cambiar de vista.

### FR-011 — Importar OpenAPI

**Criterios de aceptación:**

- se pueden seleccionar archivos JSON o YAML compatibles con la versión soportada;
- la importación presenta un resumen de resultado antes de sustituir el proyecto abierto;
- si el archivo no puede analizarse, se muestra un error útil y no se altera el proyecto existente;
- se reportan características no soportadas o que no puedan representarse fielmente;
- nunca se descarta contenido de manera silenciosa.

### FR-012 — Exportar OpenAPI

**Criterios de aceptación:**

- se exporta JSON y YAML en la versión objetivo del MVP;
- el archivo exportado puede volver a importarse dentro del alcance de soporte sin perder elementos esenciales;
- la exportación se realiza a través de una escritura segura, evitando dejar archivos truncados cuando falle la operación;
- el usuario ve el resultado real de la operación y la ubicación elegida.

### FR-013 — Guardado automático y recuperación

**Criterios de aceptación:**

- la interfaz muestra estados como guardando, guardado y error al guardar;
- el guardado automático no genera una escritura de disco en cada pulsación sin ningún control;
- si falla el guardado, se conserva el estado en memoria y se informa al usuario;
- el usuario puede volver a intentar guardar y no se le muestra un estado falso de éxito.

### FR-014 — Configuración básica

En el MVP se podrán configurar, como mínimo, preferencia de tema claro/oscuro si el coste es bajo y el tamaño de fuente solo si se integra de forma consistente. Las preferencias no deben retrasar las funciones centrales.

### FR-015 — Ejemplo inicial

La aplicación debe incluir una acción para abrir un proyecto de ejemplo, o proporcionar un proyecto demostrativo documentado. El ejemplo tendrá, al menos, un esquema `Vehicle`, un esquema `WorkOrder`, una operación GET por identificador y una operación POST de creación.

El proyecto de ejemplo no debe mezclarse con proyectos reales ni sobrescribir sus datos.

## 7. Reglas de validación iniciales

Las reglas deben identificarse con códigos estables y probarse unitariamente. El catálogo inicial puede ampliarse, pero toda nueva regla debe documentar su intención, severidad por defecto y limitaciones.

### 7.1 Errores estructurales

- `STRUCT-001`: falta un campo requerido por el modelo interno para producir una definición utilizable.
- `STRUCT-002`: hay dos operaciones con el mismo método y ruta.
- `STRUCT-003`: hay referencias internas que apuntan a componentes inexistentes.
- `STRUCT-004`: una referencia a parámetro de ruta no coincide con las variables declaradas en la ruta.
- `STRUCT-005`: hay parámetros de ruta que no se representan en la plantilla o no son obligatorios.
- `STRUCT-006`: `operationId` duplicado cuando se ha definido.
- `STRUCT-007`: un esquema utiliza un tipo, combinación o restricción no representable en el subconjunto de exportación seleccionado.
- `STRUCT-008`: la definición no puede convertirse a una especificación OpenAPI de la versión objetivo.

Los códigos son identificadores propuestos; si la biblioteca elegida expone reglas propias, deben mapearse a un formato uniforme de diagnóstico cuando sea factible.

### 7.2 Advertencias de consistencia

- `CONS-001`: respuestas equivalentes usan modelos de error incompatibles dentro de operaciones similares.
- `CONS-002`: operaciones con nombres o estructuras aparentemente duplicadas.
- `CONS-003`: esquemas definidos que no son referenciados por ninguna operación ni por otro esquema.
- `CONS-004`: endpoint que devuelve una colección sin parámetros de paginación. Esta regla es una advertencia configurable, no un error de OpenAPI.
- `CONS-005`: operación sin descripción suficiente para ayudar a los consumidores.
- `CONS-006`: respuesta de error habitual ausente, cuando una regla de estilo la recomiende.

Estas reglas no deben fingir entender el dominio de negocio. Una advertencia contextual no equivale a un error técnico.

### 7.3 Sugerencias

- recomendar componentes reutilizables cuando se repite la misma estructura;
- sugerir convenciones de nombres;
- sugerir paginación para colecciones potencialmente extensas;
- sugerir formatos de error consistentes;
- advertir sobre cambios incompatibles cuando exista comparación entre dos definiciones.

Las sugerencias automáticas avanzadas y el análisis de compatibilidad entre versiones pueden dejarse para una etapa posterior.

## 8. Importación, exportación e interoperabilidad

### 8.1 Fuente de verdad

El modelo de dominio interno es la fuente de verdad durante la edición. Los archivos OpenAPI son formatos de intercambio y distribución del contrato.

### 8.2 Importación sin pérdida silenciosa

Los importadores pueden encontrarse con campos y construcciones que el editor todavía no represente. En ese caso deben:

1. detectar la limitación cuando sea posible;
2. informar qué elemento está afectado;
3. no sobrescribir un proyecto existente hasta que el usuario confirme la importación;
4. evitar declarar una importación totalmente fiel si se han omitido datos;
5. documentar cualquier límite conocido.

Para la primera versión puede definirse explícitamente un subconjunto soportado. No se exige implementar desde el primer día cada característica de OpenAPI, pero sí mostrar con claridad los límites del subconjunto.

### 8.3 Pruebas de ida y vuelta

Crear archivos de prueba representativos y comprobar:

- parsear y volver a exportar una especificación admitida;
- conservar rutas, métodos, parámetros, cuerpos, respuestas, componentes y referencias;
- distinguir entre fallos de sintaxis, fallos de validación y características no soportadas;
- verificar que el documento exportado puede validarse con una herramienta independiente compatible con la versión seleccionada.

No exigir igualdad textual byte por byte: el orden de las claves y el formato del documento pueden cambiar. Comparar la semántica estructural relevante.

### 8.4 Referencias externas

El MVP solo resolverá referencias internas locales. No descargar automáticamente `$ref` remotos ni acceder a rutas arbitrarias. Si se importa un documento con referencias externas, se debe explicar que no forman parte del alcance inicial y evitar resolverlas sin autorización explícita.

## 9. Experiencia de usuario

### 9.1 Áreas principales

1. **Proyectos:** listado, creación, apertura y eliminación.
2. **Navegación del diseño:** metadatos, esquemas, operaciones, servidores y seguridad básica.
3. **Editor:** formularios contextuales para el elemento seleccionado.
4. **Diagnósticos:** errores, advertencias y sugerencias enlazados con sus elementos.
5. **Vista previa:** documentación generada a partir de la definición actual.

### 9.2 Flujo esperado

1. Crear un proyecto o importar una especificación.
2. Definir metadatos de la API.
3. Crear esquemas reutilizables.
4. Crear operaciones y asociar parámetros, solicitudes y respuestas.
5. Resolver errores estructurales y revisar advertencias.
6. Revisar la documentación.
7. Exportar JSON o YAML OpenAPI.

El flujo no debe ser estrictamente lineal: se debe permitir crear un esquema nuevo desde el formulario de una operación y volver a la operación después de guardarlo.

### 9.3 Reglas de interacción

- No utilizar diálogos modales para toda edición; preferir paneles o formularios contextuales cuando no se necesite bloquear el flujo.
- Confirmar operaciones destructivas.
- No descartar cambios al cambiar de sección sin aviso.
- Marcar campos inválidos junto al control correspondiente y conservar mensajes accesibles.
- Mantener separados los borradores de formulario y el documento confirmado cuando sea necesario para evitar estados parcialmente inválidos.
- Mostrar estados de carga, vacío, error y éxito.
- No usar color como único indicador de severidad.
- Priorizar navegación por teclado, foco visible y etiquetas claras.

### 9.4 Idioma

El documento y la comunicación inicial de desarrollo están en español. La interfaz del MVP puede iniciar en español, manteniendo los textos centralizados para permitir localización futura. Los nombres de recursos, propiedades, operaciones y descripciones del contrato deben ser controlados por el usuario y no traducirse automáticamente.

### 9.5 Diseño visual

- Interfaz de herramienta profesional, con jerarquía visual clara y densidad moderada.
- Panel de navegación, área de trabajo principal y panel de diagnósticos/preview.
- Tema claro y oscuro si no compromete el cronograma de las funciones centrales.
- Los diagramas son secundarios en el MVP; evitar invertir el proyecto en un editor gráfico de nodos antes de que el editor de contratos funcione de extremo a extremo.

## 10. Requisitos no funcionales

### NFR-001 — Fiabilidad de datos

No se debe perder un proyecto por un fallo de importación, exportación o persistencia. Las escrituras críticas deben ser atómicas o recuperables.

### NFR-002 — Rendimiento percibido

La edición de proyectos habituales debe sentirse inmediata. La validación no debe bloquear la interfaz; si una operación supera el tiempo esperado, debe mostrarse un estado de progreso.

### NFR-003 — Privacidad

Los proyectos se almacenan localmente. No enviar contenido de diseño a servicios externos en el MVP. No implementar telemetría de contenido.

### NFR-004 — Seguridad

- Restringir permisos de Tauri a las capacidades necesarias.
- No exponer comandos IPC genéricos que permitan acceso libre al sistema de archivos o ejecución de procesos.
- Tratar archivos importados como entrada no confiable.
- Limitar tamaños de archivo importado y mostrar errores controlados.
- No resolver referencias remotas automáticamente.
- Evitar registrar el contenido completo de proyectos en logs salvo que sea imprescindible para depuración y el usuario lo autorice.

### NFR-005 — Mantenibilidad

- Separación de dominio, aplicación, infraestructura e interfaz.
- Funciones de dominio testeables sin levantar Tauri.
- Errores tipados en Rust; evitar propagar cadenas genéricas como única representación de error.
- Documentar decisiones y reglas de validación.
- Mantener dependencias actualizadas y revisar licencias.

### NFR-006 — Portabilidad

Tauri soporta los principales sistemas de escritorio. El proyecto debe evitar decisiones innecesariamente específicas de un sistema operativo. Durante el desarrollo se priorizará el sistema del entorno de trabajo, y se planificarán pruebas de empaquetado en los sistemas operativos que se decida publicar.

### NFR-007 — Accesibilidad

Etiquetas semánticas, navegación por teclado, foco visible, contraste legible y mensajes de error asociados a los controles.

## 11. Estrategia de pruebas y calidad

### 11.1 Pruebas Rust

- Unitarias para invariantes del dominio y reglas de validación.
- Pruebas de serialización y deserialización del modelo interno.
- Integración para persistencia SQLite y migraciones.
- Pruebas de importación/exportación con fixtures admitidos e inválidos.
- Pruebas de referencias rotas, duplicados, rutas y parámetros.

### 11.2 Pruebas frontend

- Pruebas de componentes y validaciones de formularios.
- Pruebas de integración del flujo de edición, navegación y diagnósticos.
- Pruebas de estados de carga, vacío, error de persistencia y confirmación destructiva.

### 11.3 Pruebas de interoperabilidad

- Comparar la definición exportada con la representación esperada.
- Validar exportaciones mediante herramientas independientes cuando sea posible.
- Probar importación de archivos OpenAPI correctos, inválidos y parcialmente no soportados.
- Verificar que un error de importación no modifica el proyecto abierto.

### 11.4 Comprobaciones de entrega

El agente debe escoger los comandos reales según el scaffold, documentarlos y ejecutar los que correspondan. Como mínimo, cuando estén configurados:

- `cargo fmt --check`
- `cargo clippy --all-targets --all-features -- -D warnings` (ajustar solo si una característica válida del proyecto lo exige y documentarlo)
- `cargo test`
- comprobación TypeScript (`tsc --noEmit` o equivalente)
- pruebas frontend
- build frontend
- build desktop de desarrollo

No declarar que una prueba pasó sin haber ejecutado el comando y revisado su resultado. Si no puede ejecutarse por una dependencia del entorno, indicar el bloqueo exacto.

## 12. Plan de implementación por hitos

Cada hito requiere un commit o conjunto de cambios coherente, documentación mínima y resultados de prueba. No se debe comenzar el siguiente hito si el actual no compila o mantiene defectos conocidos sin registrar.

### Hito 0 — Verificación técnica y decisiones iniciales

Objetivo: reducir riesgos antes de crear la aplicación completa.

Tareas:

- verificar versiones estables actuales de Rust, Tauri, Bun, Node si se requiere, React, Vite y bibliotecas candidatas;
- validar los prerrequisitos desktop del entorno de desarrollo;
- comparar opciones para parsear/exportar OpenAPI 3.1.x y JSON/YAML;
- comprobar el estado de mantenimiento de la biblioteca YAML candidata;
- documentar arquitectura y dependencias en ADR;
- fijar un fixture OpenAPI pequeño como caso de prueba.

Entregables:

- `docs/ARCHITECTURE.md`;
- ADR de stack y OpenAPI;
- resumen de riesgos y decisiones.

Criterio de salida: se pueden justificar la arquitectura y las bibliotecas iniciales; no se requiere tener implementadas las funciones del producto.

### Hito 1 — Esqueleto ejecutable

Objetivo: tener una aplicación desktop mínima que compile y abra una ventana.

Tareas:

- crear el proyecto con el scaffold oficial actual de Tauri 2;
- configurar Rust y React/TypeScript/Vite;
- configurar Bun y scripts reproducibles;
- diseñar layout inicial con navegación y vistas vacías;
- añadir README con requisitos y comandos.

Criterios de salida:

- frontend ejecuta en modo desarrollo;
- app desktop abre correctamente;
- build frontend y comprobaciones Rust pasan;
- sin lógica funcional prematura.

### Hito 2 — Dominio y modelo interno

Objetivo: establecer el modelo de API y reglas básicas sin depender de la UI.

Tareas:

- crear tipos de proyecto, definición, esquemas, operaciones, parámetros, cuerpos y respuestas;
- modelar referencias internas;
- definir errores tipados;
- agregar reglas básicas de identidad y unicidad;
- escribir pruebas unitarias.

Criterios de salida:

- los tipos se serializan de forma estable;
- las reglas del dominio pueden probarse sin ejecutar la aplicación desktop;
- decisiones de modelo registradas.

### Hito 3 — Persistencia local

Objetivo: crear y recuperar proyectos.

Tareas:

- definir ubicación segura de datos de aplicación;
- crear almacenamiento SQLite y migraciones;
- persistir la definición como documento JSON versionado;
- implementar CRUD de proyectos;
- mostrar estados de guardado y errores.

Criterios de salida:

- crear, cerrar y reabrir proyecto conserva datos;
- fallo de guardado produce error visible;
- pruebas de persistencia y migración pasan.

### Hito 4 — Gestión de esquemas

Objetivo: editar esquemas reutilizables.

Tareas:

- listado de esquemas;
- creación, edición y eliminación;
- propiedades y tipos básicos;
- referencias a esquemas internos;
- detección de componentes en uso.

Criterios de salida:

- cambios persisten;
- referencias inexistentes son detectables;
- el esquema de ejemplo puede construirse desde la interfaz.

### Hito 5 — Gestión de operaciones

Objetivo: diseñar endpoints completos.

Tareas:

- listado de operaciones y rutas;
- método, ruta, `operationId`, resumen, descripción y tags;
- parámetros;
- cuerpos de solicitud;
- respuestas y códigos HTTP;
- referencias a esquemas;
- validaciones estructurales iniciales.

Criterios de salida:

- se puede construir una API de ejemplo útil de extremo a extremo;
- errores y advertencias señalan los elementos afectados.

### Hito 6 — Motor de validación y diagnósticos

Objetivo: formalizar el diagnóstico del diseño.

Tareas:

- definir catálogo de reglas y códigos;
- ejecutar validación determinista sobre el modelo;
- construir lista de diagnósticos;
- enlazar diagnósticos con elementos editables;
- separar errores, advertencias y sugerencias.

Criterios de salida:

- cada regla activa tiene pruebas unitarias;
- la interfaz no duplica la lógica del validador;
- los diagnósticos pueden actualizarse tras un cambio.

### Hito 7 — Importación y exportación OpenAPI

Objetivo: interoperar con herramientas existentes.

Tareas:

- implementar importador JSON/YAML para el subconjunto definido;
- importar a modelo interno sin sustituir el proyecto actual hasta confirmar;
- implementar exportadores JSON/YAML;
- reportar campos o construcciones no soportados;
- validar exportaciones con fixtures y herramientas independientes.

Criterios de salida:

- los casos admitidos pasan las pruebas de ida y vuelta;
- los casos no admitidos producen mensajes claros;
- la exportación no genera documentos inválidos dentro del alcance prometido.

### Hito 8 — Documentación, pulido y empaquetado inicial

Objetivo: entregar una aplicación demostrable y reproducible.

Tareas:

- vista previa de documentación;
- proyecto de ejemplo;
- estados vacíos, errores, guardado y confirmaciones;
- revisión de accesibilidad básica;
- pruebas finales y documentación de instalación;
- comprobar el empaquetado en el entorno objetivo.

Criterios de salida:

- el usuario puede completar el flujo completo definido en el apartado 13;
- los pasos de instalación/desarrollo están documentados;
- las limitaciones conocidas están registradas.

## 13. Escenario de aceptación de extremo a extremo

El agente debe utilizar este flujo como prueba de referencia para el MVP:

1. Abrir CAAD y crear un proyecto llamado `Workshop API`.
2. Definir el título, la descripción y la versión de la API.
3. Crear un esquema `Vehicle` con `id`, `licensePlate`, `make` y `modelYear`.
4. Crear un esquema `WorkOrder` que incluya un identificador y una referencia o propiedad asociada a un vehículo.
5. Crear `GET /vehicles/{vehicleId}` y definir el parámetro de ruta requerido.
6. Configurar una respuesta `200` con el esquema `Vehicle` y una respuesta `404` con una descripción de no encontrado.
7. Crear `POST /work-orders` con un cuerpo JSON basado en el esquema apropiado y una respuesta `201`.
8. Introducir a propósito un error, como una referencia a un esquema inexistente, y comprobar que aparece un diagnóstico enlazado al elemento.
9. Corregir el error y comprobar que desaparece en la siguiente validación.
10. Cerrar y volver a abrir el proyecto; verificar que la definición se conserva.
11. Exportar a OpenAPI JSON y YAML.
12. Validar los archivos exportados y volver a importar uno de ellos en un proyecto separado.

La prueba no exige que exista un backend ejecutable. Su resultado es un contrato de API válido dentro del alcance soportado.

## 14. Reglas específicas para el agente de programación

### 14.1 Forma de trabajo

Para cada hito:

1. leer el documento y revisar el código actual;
2. identificar el objetivo concreto y sus archivos afectados;
3. proponer un plan corto y señalar riesgos;
4. implementar la porción mínima necesaria;
5. ejecutar pruebas, lint y build aplicables;
6. corregir regresiones causadas por el cambio;
7. actualizar documentación y checklist;
8. resumir archivos modificados, decisiones, comandos ejecutados, resultados y limitaciones.

### 14.2 Restricciones

- No implementar varios hitos completos en una sola respuesta.
- No agregar IA generativa antes de que el flujo determinista funcione.
- No añadir dependencias sin explicar qué problema resuelven.
- No ocultar errores ignorándolos o usando `unwrap()` indiscriminadamente en rutas de ejecución que procesan datos externos o entradas de usuario.
- No hacer que el frontend y Rust mantengan dos reglas de negocio divergentes.
- No usar llamadas de red en el flujo principal sin una decisión explícita.
- No reescribir archivos o proyectos del usuario durante una importación sin confirmación.
- No cambiar decisiones arquitectónicas silenciosamente.
- No marcar tareas como completas si falta una prueba esencial.
- No tratar recomendaciones de diseño como defectos obligatorios del estándar.

### 14.3 Gestión de contexto y documentación

Mantener actualizado:

- `README.md`: descripción breve y comandos vigentes;
- `docs/PRODUCT_SPEC.md`: alcance funcional y decisiones de producto;
- `docs/ARCHITECTURE.md`: componentes y dependencias;
- `docs/DATA_MODEL.md`: modelo interno y versión del documento persistido;
- `docs/VALIDATION_RULES.md`: catálogo de reglas activas;
- `docs/ADR/`: decisiones arquitectónicas que cambien dependencias o estructura;
- `docs/milestones/`: checklist y estado de los hitos.

Si el agente descubre que la implementación difiere del documento, debe determinar si es un error de implementación o una decisión nueva. Corregir el error o proponer la actualización explícita del documento; no dejar divergencias sin registrar.

### 14.4 Formato de cierre de cada hito

Al finalizar cada hito, informar:

- qué se implementó;
- qué queda fuera del hito;
- archivos o módulos principales afectados;
- comandos de pruebas ejecutados y sus resultados;
- problemas conocidos;
- siguiente hito recomendado.

## 15. Riesgos iniciales y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El alcance crece hasta intentar competir con una plataforma API completa. | Mantener los no objetivos y exigir una razón de producto para ampliar el MVP. |
| El modelo interno queda acoplado a una biblioteca OpenAPI. | Crear tipos de dominio propios y adaptadores de importación/exportación. |
| La importación altera o pierde contenido desconocido. | Informe de compatibilidad, fixtures y prohibición de pérdida silenciosa. |
| La validación propia se presenta como cumplimiento completo del estándar. | Distinguir reglas internas de validación OpenAPI; probar con herramientas independientes. |
| La interfaz crece antes de definir invariantes del dominio. | Implementar y probar el dominio antes de añadir formularios complejos. |
| Se pierde trabajo por autosave defectuoso. | Persistencia transaccional, estados visibles y pruebas de fallo. |
| Dependencias YAML/OpenAPI poco mantenidas o incompletas. | Verificación técnica durante el Hito 0 y ADR con limitaciones. |
| Se introduce IA antes de disponer de contexto estructurado fiable. | Dejar la IA para después; si se añade, deberá operar sobre el modelo interno validado. |
| Diferencias entre sistemas operativos. | Separar la lógica del sistema operativo, documentar prerrequisitos y probar empaquetado objetivo. |

## 16. Decisiones pendientes, con valor inicial recomendado

Estas decisiones no deben bloquear los primeros hitos, pero deben quedar registradas cuando llegue el momento correspondiente.

| Decisión | Valor inicial recomendado | Momento para revisarla |
|---|---|---|
| Nombre comercial | CAAD como nombre de trabajo | Antes de distribución pública |
| Sistemas destino | Desarrollo primero en el sistema disponible; evitar dependencia específica y planificar pruebas de los SO objetivo | Hito 0 y empaquetado |
| Framework de UI | Tauri 2 + React + TypeScript + Vite | Hito 0; cambiar solo si el prototipo revela un problema importante |
| Gestor frontend | Bun | Hito 0, validando scripts y lockfile reproducibles |
| OpenAPI | 3.1.x para el primer soporte estable; evaluar 3.2.x después | Hito 0 y antes del importador |
| Persistencia | SQLite con documento JSON versionado por proyecto | Hito 0/Hito 3 |
| Historial de revisiones | No incluir inicialmente | Después de validar el MVP |
| Colaboración remota | Fuera del MVP | Producto posterior |
| IA generativa | Fuera del primer flujo funcional | Después del Hito 7 u 8 |
| Exportación de proyecto propio | Solo si la persistencia local demuestra insuficiente portabilidad | Después del MVP |

## 17. Definición de terminado del MVP

CAAD puede considerarse un MVP cuando:

- se instala y abre como aplicación desktop en el entorno objetivo;
- permite crear y persistir proyectos localmente;
- permite crear esquemas reutilizables y operaciones REST dentro del alcance definido;
- valida errores estructurales y muestra advertencias de diseño documentadas;
- permite revisar una vista previa de la documentación;
- importa y exporta OpenAPI 3.1.x dentro de los límites anunciados;
- no pierde silenciosamente componentes no soportados ni cambios locales;
- pasa los tests, lint y builds declarados en la documentación;
- incluye un ejemplo funcional y un README reproducible;
- documenta las limitaciones conocidas y las siguientes mejoras propuestas.

## 18. Instrucción inicial para el agente de IA

Usa este documento como contexto maestro para el desarrollo de CAAD. No implementes todo el proyecto en una sola iteración. Comienza por el **Hito 0 — Verificación técnica y decisiones iniciales**.

Primero inspecciona el repositorio y el entorno, verifica la documentación oficial y el estado actual de las herramientas propuestas, y evalúa especialmente el soporte real de las bibliotecas candidatas para OpenAPI 3.1.x, JSON y YAML. Evita asumir que una biblioteca soporta completamente una especificación por el nombre del crate o por un ejemplo simple.

Presenta un plan breve con los hallazgos, las decisiones recomendadas, los riesgos, las bibliotecas seleccionadas y los comandos de prueba previstos. Después realiza únicamente el trabajo necesario para cerrar el Hito 0. No empieces a construir todas las funcionalidades de la aplicación hasta que las decisiones críticas estén registradas y exista una ruta técnica reproducible.

En todas las etapas, conserva la separación de responsabilidades, ejecuta pruebas reales, informa los resultados con precisión y mantén este documento y los ADR alineados con el repositorio.

## 19. Referencias técnicas iniciales

Estas referencias son puntos de partida. El agente debe verificar la documentación vigente antes de fijar versiones o tomar decisiones técnicas finales.

- Tauri 2 — inicio y arquitectura: https://v2.tauri.app/start/
- Tauri 2 — configuración del frontend: https://v2.tauri.app/start/frontend/
- React: https://react.dev/
- Vite: https://vite.dev/
- Rust: https://www.rust-lang.org/learn
- Slint, como alternativa de GUI Rust-first: https://docs.slint.dev/latest/docs/slint/
- egui, como alternativa de GUI immediate-mode: https://docs.rs/egui/latest/egui/
- iced, como alternativa de GUI Rust: https://iced.rs/
- OpenAPI Specification: https://spec.openapis.org/oas/
- OpenAPI 3.2.1: https://spec.openapis.org/oas/v3.2.1.html
- `openapiv3_1`, candidato de investigación para tipos OpenAPI 3.1: https://docs.rs/openapiv3_1/
- `serde_yaml` está marcado como deprecated/no mantenido; investigar alternativas vigentes en lugar de adoptarlo por defecto: https://docs.rs/serde_yaml/latest/serde_yaml/

---

**Fin del documento maestro inicial.** Este documento debe evolucionar con el proyecto: los cambios de alcance y arquitectura deben registrarse deliberadamente, no aparecer de forma accidental durante la implementación.
