import React, { useState, useEffect, useMemo } from "react";
import { Project, SchemaDefinition, DesignIssue } from "../../app/types";
import { EmptyView } from "../../components/EmptyView";
import { getSchemaUsages, validateDocument, normalizeProject } from "../../lib/tauri";
import {
  Boxes,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Code2,
  AlertTriangle,
  X,
  Pencil,
  GitFork,
  Layers,
  CornerDownRight,
} from "lucide-react";

interface SchemasViewProps {
  project: Project | null;
  onUpdateProject: (updated: Project) => void;
  onNavigateToProjects: () => void;
  targetSchemaName?: string | null;
}

type PropertyTypeOption =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null"
  | "ref";

export const SchemasView: React.FC<SchemasViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToProjects,
  targetSchemaName,
}) => {
  const [selectedSchemaName, setSelectedSchemaName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newSchemaModalOpen, setNewSchemaModalOpen] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState("");
  const [newSchemaType, setNewSchemaType] = useState<"object" | "string" | "integer" | "number" | "boolean" | "array">("object");
  const [newSchemaError, setNewSchemaError] = useState<string | null>(null);

  // Modal para renombrar esquema con refactorización automática
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [schemaToRename, setSchemaToRename] = useState<string>("");
  const [newSchemaTargetName, setNewSchemaTargetName] = useState<string>("");
  const [renameError, setRenameError] = useState<string | null>(null);

  // Modal para confirmación de eliminación con protección de usos
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [deleteUsages, setDeleteUsages] = useState<string[]>([]);
  const [isCheckingUsages, setIsCheckingUsages] = useState(false);

  // Nueva propiedad inline
  const [newPropName, setNewPropName] = useState("");

  // Vista de JSON Schema
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Diagnósticos de validación en tiempo real
  const [validationIssues, setValidationIssues] = useState<DesignIssue[]>([]);

  const safeProject = useMemo(() => {
    return project ? normalizeProject(project) : null;
  }, [project]);

  const schemas = useMemo(() => {
    return safeProject?.document?.schemas ?? {};
  }, [safeProject]);

  const schemaNames = useMemo(() => {
    return Object.keys(schemas).sort();
  }, [schemas]);

  // Si se pasa targetSchemaName desde diagnósticos u otra vista, seleccionarlo
  useEffect(() => {
    if (targetSchemaName && schemas[targetSchemaName]) {
      setSelectedSchemaName(targetSchemaName);
    }
  }, [targetSchemaName, schemas]);

  // Si no hay seleccionado o el seleccionado fue eliminado, seleccionar el primero disponible
  useEffect(() => {
    if (schemaNames.length > 0) {
      if (!selectedSchemaName || !schemas[selectedSchemaName]) {
        setSelectedSchemaName(schemaNames[0]);
      }
    } else {
      setSelectedSchemaName(null);
    }
  }, [schemaNames, selectedSchemaName, schemas]);

  // Validar documento en tiempo real
  useEffect(() => {
    if (!safeProject) {
      setValidationIssues([]);
      return;
    }
    let isMounted = true;
    validateDocument(safeProject.document).then((issues) => {
      if (isMounted) setValidationIssues(issues);
    });
    return () => {
      isMounted = false;
    };
  }, [safeProject]);

  if (!safeProject) {
    return (
      <EmptyView
        icon={Boxes}
        title="Ningún proyecto en sesión"
        description="Abre o crea un proyecto desde la sección 'Proyectos' para modelar y gestionar esquemas de datos reutilizables OpenAPI 3.1."
        actionLabel="IR AL DIRECTORIO"
        onAction={onNavigateToProjects}
      />
    );
  }

  const selectedSchema = selectedSchemaName ? schemas[selectedSchemaName] : null;

  // Extracción de herencia base vía allOf
  const baseSchemaRef = selectedSchema?.allOf?.find((item) => Boolean(item.$ref))?.$ref;
  const baseSchemaName = baseSchemaRef ? baseSchemaRef.replace("#/components/schemas/", "") : "";
  const baseSchema = baseSchemaName ? schemas[baseSchemaName] : null;

  // Filtrado de nombres
  const filteredSchemaNames = schemaNames.filter((name) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Actualizar un esquema existente en el proyecto
  const updateCurrentSchema = (updater: (prev: SchemaDefinition) => SchemaDefinition) => {
    if (!selectedSchemaName || !selectedSchema) return;
    const updatedSchema = updater(selectedSchema);
    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        schemas: {
          ...safeProject.document.schemas,
          [selectedSchemaName]: updatedSchema,
        },
      },
    };
    onUpdateProject(updatedProject);
  };

  // Crear nuevo esquema
  const handleCreateSchema = () => {
    const trimmed = newSchemaName.trim();
    if (!trimmed) {
      setNewSchemaError("El nombre del esquema no puede estar vacío.");
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
      setNewSchemaError("El nombre solo puede contener caracteres alfanuméricos, puntos, guiones y guiones bajos.");
      return;
    }
    if (schemas[trimmed]) {
      setNewSchemaError(`Ya existe un esquema con el nombre '${trimmed}'.`);
      return;
    }

    const newSchemaDef: SchemaDefinition = {
      name: trimmed,
      schema_type: newSchemaType,
      allows_null: false,
      properties: newSchemaType === "object" ? {} : undefined,
      required: newSchemaType === "object" ? [] : undefined,
    };

    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        schemas: {
          ...safeProject.document.schemas,
          [trimmed]: newSchemaDef,
        },
      },
    };

    onUpdateProject(updatedProject);
    setSelectedSchemaName(trimmed);
    setNewSchemaName("");
    setNewSchemaError(null);
    setNewSchemaModalOpen(false);
  };

  // Cargar ejemplo estándar de especificación: Vehicle y WorkOrder
  const handleLoadSampleSchemas = () => {
    const vehicleSchema: SchemaDefinition = {
      name: "Vehicle",
      schema_type: "object",
      description: "Entidad que representa un vehículo dentro del taller mecánico.",
      allows_null: false,
      required: ["id", "vin", "make", "model", "year"],
      properties: {
        id: {
          schema_type: "string",
          format: "uuid",
          description: "Identificador único global del vehículo",
        },
        vin: {
          schema_type: "string",
          min_length: 17,
          max_length: 17,
          description: "Número de identificación vehicular (17 caracteres)",
        },
        make: {
          schema_type: "string",
          description: "Marca del fabricante (ej. Toyota, Ford)",
        },
        model: {
          schema_type: "string",
          description: "Modelo del vehículo",
        },
        year: {
          schema_type: "integer",
          minimum: 1900,
          description: "Año de fabricación del vehículo",
        },
      },
    };

    const workOrderSchema: SchemaDefinition = {
      name: "WorkOrder",
      schema_type: "object",
      description: "Orden de trabajo de reparación o mantenimiento asignada a un vehículo.",
      allows_null: false,
      required: ["id", "description", "vehicle", "created_at"],
      properties: {
        id: {
          schema_type: "string",
          format: "uuid",
          description: "Identificador único de la orden",
        },
        description: {
          schema_type: "string",
          description: "Detalle de las reparaciones o revisiones a realizar",
        },
        status: {
          schema_type: "string",
          description: "Estado de la orden (ej. pending, in_progress, completed)",
        },
        vehicle: {
          $ref: "#/components/schemas/Vehicle",
          description: "Vehículo asociado a la orden de trabajo",
        },
        created_at: {
          schema_type: "string",
          format: "date-time",
          description: "Fecha y hora de creación de la orden",
        },
      },
    };

    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        schemas: {
          ...safeProject.document.schemas,
          Vehicle: vehicleSchema,
          WorkOrder: workOrderSchema,
        },
      },
    };

    onUpdateProject(updatedProject);
    setSelectedSchemaName("Vehicle");
  };

  // Cargar modelo de ejemplo de Animales con herencia allOf y arrays tipados/referenciados
  const handleLoadAnimalSchemas = () => {
    const animalSchema: SchemaDefinition = {
      name: "Animal",
      schema_type: "object",
      description: "Esquema base que define los atributos comunes a cualquier animal.",
      allows_null: false,
      required: ["id", "species"],
      properties: {
        id: {
          schema_type: "integer",
          description: "Identificador único secuencial del animal",
          example: 101,
        },
        species: {
          schema_type: "string",
          description: "Nombre taxonómico o científico de la especie",
          example: "Canis lupus",
        },
        tags: {
          schema_type: "array",
          description: "Etiquetas generales asociadas al animal",
          items: {
            schema_type: "string",
          },
          example: ["mamífero", "carnívoro", "terrestre"],
        },
      },
    };

    const vaccineSchema: SchemaDefinition = {
      name: "Vaccine",
      schema_type: "object",
      description: "Esquema de apoyo para el registro de vacunas administradas.",
      allows_null: false,
      required: ["name", "dateApplied"],
      properties: {
        name: {
          schema_type: "string",
          description: "Nombre comercial o biológico de la vacuna aplicada",
          example: "Antirrábica",
        },
        dateApplied: {
          schema_type: "string",
          format: "date",
          description: "Fecha en la que fue suministrada la dosis",
          example: "2026-03-15",
        },
      },
    };

    const petSchema: SchemaDefinition = {
      name: "Pet",
      schema_type: "object",
      description: "Animal domesticado o mascota registrada. Hereda de Animal mediante allOf.",
      allows_null: false,
      allOf: [{ $ref: "#/components/schemas/Animal" }],
      required: ["name"],
      properties: {
        name: {
          schema_type: "string",
          description: "Nombre asignado a la mascota",
          example: "Max",
        },
        vaccines: {
          schema_type: "array",
          description: "Historial de vacunas aplicadas a la mascota",
          items: {
            $ref: "#/components/schemas/Vaccine",
          },
        },
      },
    };

    const wildlifeSchema: SchemaDefinition = {
      name: "Wildlife",
      schema_type: "object",
      description: "Animal silvestre en programa de monitoreo ambiental. Hereda de Animal.",
      allows_null: false,
      allOf: [{ $ref: "#/components/schemas/Animal" }],
      properties: {
        conservationStatus: {
          schema_type: "string",
          description: "Estado de conservación de la especie según la lista roja de la UICN",
          enum_values: ["LC", "NT", "VU", "EN", "CR", "EW", "EX"],
          example: "VU",
        },
      },
    };

    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        schemas: {
          ...safeProject.document.schemas,
          Animal: animalSchema,
          Vaccine: vaccineSchema,
          Pet: petSchema,
          Wildlife: wildlifeSchema,
        },
      },
    };

    onUpdateProject(updatedProject);
    setSelectedSchemaName("Pet");
  };

  // Iniciar proceso de eliminación consultando usos
  const handleInitiateDelete = async (schemaName: string) => {
    setDeleteCandidate(schemaName);
    setIsCheckingUsages(true);
    try {
      const usages = await getSchemaUsages(safeProject.id, schemaName);
      setDeleteUsages(usages);
    } catch (err) {
      console.error("Error al consultar usos del esquema:", err);
      setDeleteUsages([]);
    } finally {
      setIsCheckingUsages(false);
    }
  };

  // Confirmar eliminación del esquema
  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    const updatedSchemas = { ...schemas };
    delete updatedSchemas[deleteCandidate];

    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        schemas: updatedSchemas,
      },
    };

    onUpdateProject(updatedProject);
    setDeleteCandidate(null);
    setDeleteUsages([]);
    if (selectedSchemaName === deleteCandidate) {
      const remaining = Object.keys(updatedSchemas).sort();
      setSelectedSchemaName(remaining.length > 0 ? remaining[0] : null);
    }
  };

  // Renombrar esquema activo con refactorización automática de referencias
  const handleExecuteRename = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setIsRenameModalOpen(false);
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
      setRenameError("El nombre solo puede contener letras, números, puntos, guiones y guiones bajos.");
      return;
    }
    if (schemas[trimmed] && trimmed !== oldName) {
      setRenameError(`Ya existe un esquema con el nombre '${trimmed}'.`);
      return;
    }

    const oldRef = `#/components/schemas/${oldName}`;
    const newRef = `#/components/schemas/${trimmed}`;

    // 1. Renombrar en schemas y actualizar referencias cruzadas
    const updatedSchemas: Record<string, SchemaDefinition> = {};
    for (const [key, schemaDef] of Object.entries(schemas)) {
      const destKey = key === oldName ? trimmed : key;
      const serialized = JSON.stringify(schemaDef);
      const refactoredSerialized = serialized.split(`"${oldRef}"`).join(`"${newRef}"`);
      const refactoredDef = JSON.parse(refactoredSerialized);
      if (key === oldName) {
        refactoredDef.name = trimmed;
      }
      updatedSchemas[destKey] = refactoredDef;
    }

    // 2. Renombrar referencias en operaciones (parámetros, request_body, responses)
    const operations = safeProject.document.operations ?? [];
    const serializedOps = JSON.stringify(operations);
    const refactoredOpsSerialized = serializedOps.split(`"${oldRef}"`).join(`"${newRef}"`);
    const refactoredOps = JSON.parse(refactoredOpsSerialized);

    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        schemas: updatedSchemas,
        operations: refactoredOps,
      },
    };

    onUpdateProject(updatedProject);
    setSelectedSchemaName(trimmed);
    setIsRenameModalOpen(false);
    setRenameError(null);
  };

  // Agregar propiedad a esquema de tipo objeto
  const handleAddProperty = () => {
    if (!selectedSchemaName || !selectedSchema) return;
    const trimmed = newPropName.trim();
    if (!trimmed) return;

    const currentProps = selectedSchema.properties ?? {};
    if (currentProps[trimmed]) {
      alert(`La propiedad '${trimmed}' ya existe en este esquema.`);
      return;
    }

    const updatedProps: Record<string, SchemaDefinition> = {
      ...currentProps,
      [trimmed]: {
        schema_type: "string",
        allows_null: false,
      },
    };

    updateCurrentSchema((prev) => ({
      ...prev,
      properties: updatedProps,
    }));

    setNewPropName("");
  };

  // Eliminar propiedad
  const handleDeleteProperty = (propName: string) => {
    if (!selectedSchema) return;
    const updatedProps = { ...(selectedSchema.properties ?? {}) };
    delete updatedProps[propName];

    const updatedRequired = (selectedSchema.required ?? []).filter((r) => r !== propName);

    updateCurrentSchema((prev) => ({
      ...prev,
      properties: updatedProps,
      required: updatedRequired,
    }));
  };

  // Cambiar tipo de propiedad
  const handlePropertyTypeChange = (propName: string, newType: PropertyTypeOption) => {
    if (!selectedSchema) return;
    const prop = selectedSchema.properties?.[propName];
    if (!prop) return;

    let updatedProp: SchemaDefinition;

    if (newType === "ref") {
      const firstOtherSchema = schemaNames.find((n) => n !== selectedSchemaName) ?? schemaNames[0] ?? "Schema";
      updatedProp = {
        $ref: `#/components/schemas/${firstOtherSchema}`,
        description: prop.description,
      };
    } else {
      updatedProp = {
        schema_type: newType,
        allows_null: prop.allows_null ?? false,
        description: prop.description,
        properties: newType === "object" ? {} : undefined,
        items: newType === "array" ? (prop.items ?? { schema_type: "string" }) : undefined,
      };
    }

    updateCurrentSchema((prev) => ({
      ...prev,
      properties: {
        ...prev.properties,
        [propName]: updatedProp,
      },
    }));
  };

  // Modificar detalles de una propiedad
  const updateProperty = (propName: string, updater: (p: SchemaDefinition) => SchemaDefinition) => {
    if (!selectedSchema || !selectedSchema.properties?.[propName]) return;
    const updatedProp = updater(selectedSchema.properties[propName]);
    updateCurrentSchema((prev) => ({
      ...prev,
      properties: {
        ...prev.properties,
        [propName]: updatedProp,
      },
    }));
  };

  // Toggle campo requerido
  const toggleRequired = (propName: string) => {
    if (!selectedSchema) return;
    const currentRequired = selectedSchema.required ?? [];
    const isRequired = currentRequired.includes(propName);
    const updatedRequired = isRequired
      ? currentRequired.filter((r) => r !== propName)
      : [...currentRequired, propName];

    updateCurrentSchema((prev) => ({
      ...prev,
      required: updatedRequired,
    }));
  };

  // Filtrar diagnósticos correspondientes al esquema seleccionado
  const issuesForSelectedSchema = validationIssues.filter((issue) =>
    issue.location.includes(`/components/schemas/${selectedSchemaName}`)
  );

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden", backgroundColor: "var(--bg-app)" }}>
      {/* Columna Izquierda: Master List de Esquemas */}
      <div
        style={{
          width: "300px",
          borderRight: "2px solid var(--border-strong)",
          backgroundColor: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "0.85rem", borderBottom: "2px solid var(--border-strong)", backgroundColor: "var(--bg-surface-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <span style={{ fontWeight: 900, fontSize: "0.82rem", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
              // SCHEMAS [{schemaNames.length < 10 ? `0${schemaNames.length}` : schemaNames.length}]
            </span>
            <button
              onClick={() => setNewSchemaModalOpen(true)}
              style={{
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                padding: "0.3rem 0.6rem",
                fontSize: "0.72rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                border: "1px solid #000000",
                boxShadow: "1px 1px 0px 0px #000000",
              }}
              title="Crear nuevo esquema reutilizable"
            >
              <Plus size={12} strokeWidth={3} />
              NUEVO
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: "0.6rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Buscar esquema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem 0.45rem 2rem",
                fontSize: "0.78rem",
                border: "1px solid var(--border-main)",
                backgroundColor: "var(--bg-app)",
                color: "var(--text-main)",
                fontFamily: "var(--font-mono)",
              }}
            />
          </div>
        </div>

        {/* Lista con scroll */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
          {filteredSchemaNames.length === 0 ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
              {searchQuery ? "// NINGUNA COINCIDENCIA" : "// SIN ESQUEMAS DEFINIDOS"}
              {!searchQuery && schemaNames.length === 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <button
                    onClick={handleLoadSampleSchemas}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "var(--primary)",
                      color: "#ffffff",
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      fontFamily: "var(--font-mono)",
                      border: "1px solid #000000",
                      boxShadow: "2px 2px 0px 0px #000000",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <Sparkles size={13} style={{ color: "#ffffff" }} />
                    EJEMPLO VEHICLE
                  </button>
                  <button
                    onClick={handleLoadAnimalSchemas}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "var(--bg-app)",
                      color: "var(--text-main)",
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      fontFamily: "var(--font-mono)",
                      border: "1.5px solid var(--border-strong)",
                      boxShadow: "2px 2px 0px 0px var(--border-strong)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <GitFork size={13} style={{ color: "var(--primary)" }} />
                    EJEMPLO ANIMALES (allOf & ARRAYS)
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredSchemaNames.map((name, idx) => {
              const s = schemas[name];
              const isSelected = name === selectedSchemaName;
              const hasBrokenRef = validationIssues.some(
                (issue) => issue.location === `/components/schemas/${name}` && issue.severity === "error"
              );
              const propCount = s.properties ? Object.keys(s.properties).length : 0;
              const indexStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
              const itemBaseRef = s.allOf?.find((item) => Boolean(item.$ref))?.$ref;
              const itemBaseName = itemBaseRef ? itemBaseRef.replace("#/components/schemas/", "") : null;

              return (
                <div
                  key={name}
                  onClick={() => setSelectedSchemaName(name)}
                  style={{
                    padding: "0.6rem 0.75rem",
                    marginBottom: "0.35rem",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "var(--bg-app)" : "transparent",
                    border: `1px solid ${isSelected ? "var(--primary)" : "var(--border-subtle)"}`,
                    borderLeft: `3px solid ${isSelected ? "var(--primary)" : "transparent"}`,
                    boxShadow: isSelected ? "2px 2px 0px 0px var(--primary)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.1s ease",
                  }}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        {indexStr}
                      </span>
                      {hasBrokenRef && (
                        <AlertTriangle size={13} style={{ color: "var(--error)", flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? "var(--primary)" : "var(--text-main)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {name}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.15rem", fontFamily: "var(--font-mono)" }}>
                      [{s.schema_type ?? "ref"}] {s.schema_type === "object" ? `(${propCount} props)` : ""}
                      {s.allows_null && " [nullable]"}
                      {itemBaseName && (
                        <span style={{ color: "var(--primary)", fontWeight: 700 }}> [allOf: {itemBaseName}]</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSchemaToRename(name);
                        setNewSchemaTargetName(name);
                        setRenameError(null);
                        setIsRenameModalOpen(true);
                      }}
                      style={{
                        padding: "0.25rem 0.35rem",
                        color: "var(--text-muted)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        opacity: 0.7,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--primary)";
                        e.currentTarget.style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--text-muted)";
                        e.currentTarget.style.opacity = "0.7";
                      }}
                      title="Renombrar esquema"
                    >
                      <Pencil size={12} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInitiateDelete(name);
                      }}
                      style={{
                        padding: "0.25rem 0.35rem",
                        color: "var(--text-muted)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        opacity: 0.7,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--error)";
                        e.currentTarget.style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--text-muted)";
                        e.currentTarget.style.opacity = "0.7";
                      }}
                      title="Eliminar esquema"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Columna Derecha: Detalle y Editor del Esquema */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedSchema && selectedSchemaName ? (
          <>
            {/* Header del Esquema */}
            <div
              style={{
                padding: "0.85rem 1.5rem",
                backgroundColor: "var(--bg-surface)",
                borderBottom: "2px solid var(--border-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1 }}>
                <Boxes size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1.15rem",
                        fontWeight: 900,
                        color: "var(--text-main)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {selectedSchemaName}
                    </h2>

                    <button
                      onClick={() => {
                        setSchemaToRename(selectedSchemaName);
                        setNewSchemaTargetName(selectedSchemaName);
                        setRenameError(null);
                        setIsRenameModalOpen(true);
                      }}
                      style={{
                        padding: "0.2rem 0.45rem",
                        backgroundColor: "var(--bg-app)",
                        border: "1px dashed var(--border-main)",
                        color: "var(--text-main)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.68rem",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                      }}
                      title="Renombrar este esquema"
                    >
                      <Pencil size={11} color="var(--primary)" />
                      RENOMBRAR
                    </button>

                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.5rem",
                        backgroundColor: "var(--bg-surface-subtle)",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      #/components/schemas/{selectedSchemaName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={() => {
                    setSchemaToRename(selectedSchemaName);
                    setNewSchemaTargetName(selectedSchemaName);
                    setRenameError(null);
                    setIsRenameModalOpen(true);
                  }}
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    border: "1.5px solid var(--border-strong)",
                    backgroundColor: "var(--bg-app)",
                    color: "var(--text-main)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    cursor: "pointer",
                  }}
                  title="Renombrar este esquema y actualizar referencias en todo el contrato"
                >
                  <Pencil size={13} color="var(--primary)" />
                  RENOMBRAR
                </button>

                <button
                  onClick={() => setShowJsonPreview(!showJsonPreview)}
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    border: "1px solid var(--border-strong)",
                    backgroundColor: showJsonPreview ? "var(--primary)" : "var(--bg-surface)",
                    color: showJsonPreview ? "#ffffff" : "var(--text-main)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    cursor: "pointer",
                  }}
                >
                  <Code2 size={13} />
                  {showJsonPreview ? "OCULTAR JSON" : "VER JSON SCHEMA"}
                </button>

                <button
                  onClick={() => handleInitiateDelete(selectedSchemaName)}
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    border: "1px solid var(--error)",
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    color: "var(--error)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={13} />
                  ELIMINAR
                </button>
              </div>
            </div>

            {/* Diagnósticos Específicos del Esquema */}
            {issuesForSelectedSchema.length > 0 && (
              <div
                style={{
                  margin: "1rem 1.5rem 0 1.5rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  border: "2px solid var(--error)",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "var(--error)", marginBottom: "0.3rem", fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <AlertTriangle size={14} />
                  [DIAGNÓSTICO ENCONTRADO PARA &apos;{selectedSchemaName}&apos;]
                </div>
                {issuesForSelectedSchema.map((issue) => (
                  <div key={issue.id} style={{ fontSize: "0.78rem", color: "var(--text-main)", marginBottom: "0.2rem", fontFamily: "var(--font-mono)" }}>
                    • [{issue.rule_id}] <strong>{issue.title}:</strong> {issue.message}{" "}
                    {issue.suggestion && <span style={{ color: "var(--text-muted)" }}>({issue.suggestion})</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Contenedor con Scroll del Editor */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "1.2rem 1.5rem 24rem 1.5rem",
                scrollPaddingBottom: "24rem",
              }}
            >
              {/* Sección: Propiedades Generales del Esquema */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "2px solid var(--border-strong)",
                  boxShadow: "3px 3px 0px 0px var(--border-strong)",
                  padding: "1.2rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 800, marginBottom: "0.3rem" }}>
                  // GENERAL SETTINGS // OPENAPI 3.1
                </div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 900, marginBottom: "0.8rem", textTransform: "uppercase" }}>
                  Ajustes Generales del Tipo
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.3rem" }}>
                      TIPO DE DATO BASE
                    </label>
                    <select
                      value={selectedSchema.schema_type ?? "object"}
                      onChange={(e) => {
                        const newType = e.target.value as SchemaDefinition["schema_type"];
                        updateCurrentSchema((prev) => ({
                          ...prev,
                          schema_type: newType,
                          properties: newType === "object" ? prev.properties ?? {} : undefined,
                          required: newType === "object" ? prev.required ?? [] : undefined,
                        }));
                      }}
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.6rem",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-app)",
                        color: "var(--text-main)",
                        fontSize: "0.85rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <option value="object">object (Colección de campos)</option>
                      <option value="string">string (Texto o cadena)</option>
                      <option value="integer">integer (Número entero)</option>
                      <option value="number">number (Número decimal / float)</option>
                      <option value="boolean">boolean (Booleano)</option>
                      <option value="array">array (Lista de elementos)</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", paddingTop: "1.2rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.82rem", fontFamily: "var(--font-mono)" }}>
                      <input
                        type="checkbox"
                        checked={selectedSchema.allows_null ?? false}
                        onChange={(e) =>
                          updateCurrentSchema((prev) => ({
                            ...prev,
                            allows_null: e.target.checked,
                          }))
                        }
                      />
                      <span>Permite valor nulo (OpenAPI 3.1: <code>type: [&quot;{selectedSchema.schema_type}&quot;, &quot;null&quot;]</code>)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.3rem" }}>
                    DESCRIPCIÓN DEL ESQUEMA
                  </label>
                  <input
                    type="text"
                    value={selectedSchema.description ?? ""}
                    onChange={(e) =>
                      updateCurrentSchema((prev) => ({
                        ...prev,
                        description: e.target.value || undefined,
                      }))
                    }
                    placeholder="Ej. Entidad de vehículo automotor registrada para mantenimiento..."
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      border: "1px solid var(--border-main)",
                      backgroundColor: "var(--bg-app)",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                {/* HERENCIA BASE (allOf) */}
                <div style={{ marginTop: "1rem", padding: "0.85rem", backgroundColor: "var(--bg-app)", border: "1px dashed var(--border-strong)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <GitFork size={13} style={{ color: "var(--primary)" }} />
                      <label style={{ fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                        ESQUEMA BASE // HERENCIA (allOf)
                      </label>
                    </div>
                    {baseSchemaName && (
                      <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 700 }}>
                        HEREDA DE: {baseSchemaName}
                      </span>
                    )}
                  </div>
                  <select
                    value={baseSchemaName}
                    onChange={(e) => {
                      const target = e.target.value;
                      updateCurrentSchema((prev) => {
                        if (!target) {
                          const next = { ...prev };
                          delete next.allOf;
                          return next;
                        }
                        return {
                          ...prev,
                          allOf: [{ $ref: `#/components/schemas/${target}` }],
                        };
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      border: "1px solid var(--border-main)",
                      backgroundColor: "var(--bg-surface)",
                      color: "var(--text-main)",
                      fontSize: "0.82rem",
                      fontFamily: "var(--font-mono)",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">(Ninguno — Esquema independiente sin herencia)</option>
                    {schemaNames
                      .filter((n) => n !== selectedSchemaName)
                      .map((n) => (
                        <option key={n} value={n}>
                          #/components/schemas/{n} {schemas[n]?.description ? `— ${schemas[n].description}` : ""}
                        </option>
                      ))}
                  </select>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.35rem", fontFamily: "var(--font-mono)" }}>
                    Permite extender esquemas base mediante composición <code>allOf</code> de OpenAPI 3.1, heredando automáticamente propiedades requeridas y tipado.
                  </div>
                </div>
              </div>

              {/* Si hereda de un esquema base (allOf): Visualización de Propiedades Heredadas (Lectura) */}
              {baseSchema && (
                <div
                  style={{
                    backgroundColor: "var(--bg-surface-subtle)",
                    border: "2px dashed var(--border-strong)",
                    boxShadow: "3px 3px 0px 0px var(--border-muted)",
                    padding: "1.2rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Layers size={13} />
                        // INHERITED CONTRACT // allOf
                      </div>
                      <h4 style={{ fontSize: "0.92rem", fontWeight: 900, textTransform: "uppercase", margin: "0.2rem 0 0 0" }}>
                        Propiedades Heredadas de &quot;{baseSchemaName}&quot; ({Object.keys(baseSchema.properties ?? {}).length})
                      </h4>
                    </div>

                    <button
                      onClick={() => setSelectedSchemaName(baseSchemaName)}
                      style={{
                        padding: "0.3rem 0.65rem",
                        fontSize: "0.72rem",
                        fontFamily: "var(--font-mono)",
                        border: "1px solid var(--border-strong)",
                        backgroundColor: "var(--bg-surface)",
                        color: "var(--primary)",
                        cursor: "pointer",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                      title={`Navegar para editar el esquema base '${baseSchemaName}'`}
                    >
                      EDITAR ESQUEMA BASE ↗
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                    {Object.keys(baseSchema.properties ?? {}).length === 0 ? (
                      <div style={{ padding: "0.6rem", color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                        El esquema base no tiene propiedades explícitas declaradas.
                      </div>
                    ) : (
                      Object.entries(baseSchema.properties ?? {}).map(([pName, pDef]) => {
                        const isReq = baseSchema.required?.includes(pName);
                        const isArrayRef = pDef.schema_type === "array" && pDef.items?.$ref;
                        const isArrayPrimitive = pDef.schema_type === "array" && !pDef.items?.$ref;

                        return (
                          <div
                            key={pName}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.5rem 0.75rem",
                              backgroundColor: "var(--bg-surface)",
                              border: "1px solid var(--border-subtle)",
                              flexWrap: "wrap",
                              gap: "0.5rem",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <CornerDownRight size={13} style={{ color: "var(--primary)" }} />
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.82rem", color: "var(--text-main)" }}>
                                {pName}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontFamily: "var(--font-mono)",
                                  padding: "0.1rem 0.45rem",
                                  backgroundColor: "rgba(0, 229, 255, 0.1)",
                                  color: "#00e5ff",
                                  border: "1px solid #00e5ff",
                                }}
                              >
                                {pDef.$ref
                                  ? `$ref (${pDef.$ref.replace("#/components/schemas/", "")})`
                                  : isArrayRef
                                  ? `array<$ref: ${pDef.items?.$ref?.replace("#/components/schemas/", "")}>`
                                  : isArrayPrimitive
                                  ? `array<${pDef.items?.schema_type ?? "string"}>`
                                  : pDef.schema_type ?? "object"}
                              </span>
                              {isReq && (
                                <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--error)", fontWeight: 800 }}>
                                  [REQUIRED]
                                </span>
                              )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                {pDef.description || "—"}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  fontFamily: "var(--font-mono)",
                                  padding: "0.15rem 0.45rem",
                                  backgroundColor: "var(--bg-app)",
                                  border: "1px solid var(--border-muted)",
                                  color: "var(--primary)",
                                  fontWeight: 800,
                                }}
                              >
                                HEREDADO (allOf)
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Si es tipo array a nivel raíz: Definición de elementos */}
              {selectedSchema.schema_type === "array" && (
                <div
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: "2px solid var(--border-strong)",
                    boxShadow: "3px 3px 0px 0px var(--border-strong)",
                    padding: "1.2rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 800, marginBottom: "0.2rem" }}>
                    // ROOT ARRAY MODEL // ITEMS DEFINITION
                  </div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "0.8rem" }}>
                    Tipo de Elementos del Arreglo (items)
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.3rem" }}>
                        TIPO DE DATO CONTENIDO
                      </label>
                      <select
                        value={
                          selectedSchema.items?.$ref
                            ? "ref"
                            : (selectedSchema.items?.schema_type ?? "string")
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "ref") {
                            const firstOther = schemaNames.find((n) => n !== selectedSchemaName) ?? schemaNames[0] ?? "Schema";
                            updateCurrentSchema((prev) => ({
                              ...prev,
                              items: { $ref: `#/components/schemas/${firstOther}` },
                            }));
                          } else {
                            updateCurrentSchema((prev) => ({
                              ...prev,
                              items: {
                                schema_type: val as SchemaDefinition["schema_type"],
                                format: val === "string" ? prev.items?.format : undefined,
                              },
                            }));
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "0.45rem 0.6rem",
                          border: "1px solid var(--border-main)",
                          backgroundColor: "var(--bg-app)",
                          color: "var(--text-main)",
                          fontSize: "0.85rem",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        <option value="string">string (Cadena de texto)</option>
                        <option value="integer">integer (Número entero)</option>
                        <option value="number">number (Número decimal / float)</option>
                        <option value="boolean">boolean (Booleano)</option>
                        <option value="object">object (Objeto genérico)</option>
                        <option value="ref">$ref (Referencia a otro Esquema)</option>
                      </select>
                    </div>

                    {selectedSchema.items?.$ref !== undefined ? (
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.3rem" }}>
                          ESQUEMA REFERENCIADO ($ref)
                        </label>
                        <select
                          value={selectedSchema.items.$ref}
                          onChange={(e) => {
                            const ref = e.target.value;
                            updateCurrentSchema((prev) => ({
                              ...prev,
                              items: { $ref: ref },
                            }));
                          }}
                          style={{
                            width: "100%",
                            padding: "0.45rem 0.6rem",
                            border: "1px solid var(--border-main)",
                            backgroundColor: "var(--bg-app)",
                            color: "var(--text-main)",
                            fontSize: "0.85rem",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {schemaNames.map((n) => (
                            <option key={n} value={`#/components/schemas/${n}`}>
                              #/components/schemas/{n} {schemas[n]?.description ? `— ${schemas[n].description}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : selectedSchema.items?.schema_type === "string" ? (
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.3rem" }}>
                          FORMATO DE TEXTO (format)
                        </label>
                        <select
                          value={selectedSchema.items.format ?? ""}
                          onChange={(e) => {
                            const fmt = e.target.value || undefined;
                            updateCurrentSchema((prev) => ({
                              ...prev,
                              items: { ...prev.items, format: fmt },
                            }));
                          }}
                          style={{
                            width: "100%",
                            padding: "0.45rem 0.6rem",
                            border: "1px solid var(--border-main)",
                            backgroundColor: "var(--bg-app)",
                            color: "var(--text-main)",
                            fontSize: "0.85rem",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          <option value="">(ninguno)</option>
                          <option value="date">date (YYYY-MM-DD)</option>
                          <option value="date-time">date-time (ISO 8601)</option>
                          <option value="uuid">uuid</option>
                          <option value="email">email</option>
                          <option value="uri">uri</option>
                        </select>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.25rem" }}>
                        MÍNIMO DE ELEMENTOS (minItems)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Sin límite..."
                        value={selectedSchema.min_items ?? ""}
                        onChange={(e) =>
                          updateCurrentSchema((prev) => ({
                            ...prev,
                            min_items: e.target.value ? Number(e.target.value) : undefined,
                          }))
                        }
                        style={{
                          width: "140px",
                          padding: "0.4rem 0.6rem",
                          border: "1px solid var(--border-main)",
                          backgroundColor: "var(--bg-app)",
                          color: "var(--text-main)",
                          fontSize: "0.8rem",
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.25rem" }}>
                        MÁXIMO DE ELEMENTOS (maxItems)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Sin límite..."
                        value={selectedSchema.max_items ?? ""}
                        onChange={(e) =>
                          updateCurrentSchema((prev) => ({
                            ...prev,
                            max_items: e.target.value ? Number(e.target.value) : undefined,
                          }))
                        }
                        style={{
                          width: "140px",
                          padding: "0.4rem 0.6rem",
                          border: "1px solid var(--border-main)",
                          backgroundColor: "var(--bg-app)",
                          color: "var(--text-main)",
                          fontSize: "0.8rem",
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Si es tipo objeto: Editor de Propiedades */}
              {selectedSchema.schema_type === "object" && (
                <div
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: "2px solid var(--border-strong)",
                    boxShadow: "3px 3px 0px 0px var(--border-strong)",
                    padding: "1.2rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 800, marginBottom: "0.2rem" }}>
                        // OBJECT MODEL // PROPERTIES
                      </div>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 900, textTransform: "uppercase" }}>
                        Propiedades del Objeto ({Object.keys(selectedSchema.properties ?? {}).length})
                      </h3>
                    </div>
                  </div>

                  {/* Formulario para agregar propiedad */}
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.2rem" }}>
                    <input
                      type="text"
                      placeholder="Nombre de propiedad (ej. id, vin, status, vehicle)..."
                      value={newPropName}
                      onChange={(e) => setNewPropName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddProperty();
                      }}
                      style={{
                        flex: 1,
                        padding: "0.45rem 0.75rem",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-app)",
                        color: "var(--text-main)",
                        fontSize: "0.82rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                    <button
                      onClick={handleAddProperty}
                      style={{
                        padding: "0.45rem 1.1rem",
                        backgroundColor: "var(--primary)",
                        color: "#ffffff",
                        fontSize: "0.78rem",
                        fontWeight: 900,
                        fontFamily: "var(--font-mono)",
                        border: "1px solid #000000",
                        boxShadow: "2px 2px 0px 0px #000000",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        cursor: "pointer",
                        transition: "all 0.1s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--primary-hover)";
                        e.currentTarget.style.transform = "translate(-1px, -1px)";
                        e.currentTarget.style.boxShadow = "3px 3px 0px 0px #000000";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--primary)";
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "2px 2px 0px 0px #000000";
                      }}
                    >
                      <Plus size={14} />
                      AGREGAR CAMPO
                    </button>
                  </div>

                  {/* Lista de propiedades */}
                  {Object.keys(selectedSchema.properties ?? {}).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.82rem", fontFamily: "var(--font-mono)" }}>
                      // ESTE OBJETO NO CONTIENE PROPIEDADES DEFINIDAS AÚN
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {Object.entries(selectedSchema.properties ?? {}).map(([propName, propDef]) => {
                        const isRequired = (selectedSchema.required ?? []).includes(propName);
                        const isRef = Boolean(propDef.$ref);
                        const propType: PropertyTypeOption = isRef
                          ? "ref"
                          : (propDef.schema_type ?? "string");

                        return (
                          <div
                            key={propName}
                            style={{
                              border: "1px solid var(--border-main)",
                              padding: "0.85rem 1rem",
                              backgroundColor: "var(--bg-app)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.8rem", marginBottom: "0.5rem" }}>
                              {/* Nombre */}
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                                  {propName}
                                </span>
                                {isRequired && (
                                  <span style={{ fontSize: "0.62rem", padding: "0.1rem 0.35rem", backgroundColor: "var(--primary)", color: "#ffffff", fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                                    REQUIRED
                                  </span>
                                )}
                              </div>

                              {/* Controles de tipo y flags */}
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <select
                                  value={propType}
                                  onChange={(e) => handlePropertyTypeChange(propName, e.target.value as PropertyTypeOption)}
                                  onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                                  onClick={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                                  style={{
                                    padding: "0.3rem 1.8rem 0.3rem 0.65rem",
                                    height: "28px",
                                    fontSize: "0.78rem",
                                    border: "1px solid var(--border-main)",
                                    backgroundColor: "var(--bg-surface)",
                                    color: "var(--text-main)",
                                    fontFamily: "var(--font-mono)",
                                    cursor: "pointer",
                                  }}
                                >
                                  <option value="string">string</option>
                                  <option value="integer">integer</option>
                                  <option value="number">number</option>
                                  <option value="boolean">boolean</option>
                                  <option value="array">array</option>
                                  <option value="object">object</option>
                                  <option value="null">null</option>
                                  <option value="ref">$ref (Referencia)</option>
                                </select>

                                {/* Checkbox Requerido */}
                                <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.72rem", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
                                  <input
                                    type="checkbox"
                                    checked={isRequired}
                                    onChange={() => toggleRequired(propName)}
                                  />
                                  <span>Req</span>
                                </label>

                                {/* Checkbox allows_null */}
                                {!isRef && (
                                  <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.72rem", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
                                    <input
                                      type="checkbox"
                                      checked={propDef.allows_null ?? false}
                                      onChange={(e) =>
                                        updateProperty(propName, (p) => ({ ...p, allows_null: e.target.checked }))
                                      }
                                    />
                                    <span>Null</span>
                                  </label>
                                )}

                                {/* Botón eliminar */}
                                <button
                                  onClick={() => handleDeleteProperty(propName)}
                                  style={{
                                    padding: "0.2rem 0.35rem",
                                    color: "var(--error)",
                                  }}
                                  title="Eliminar propiedad"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Opciones Específicas del Tipo */}
                            {isRef ? (
                              <div style={{ marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <label style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                                  REFERENCIA $REF:
                                </label>
                                <select
                                  value={propDef.$ref ?? ""}
                                  onChange={(e) =>
                                    updateProperty(propName, (p) => ({ ...p, $ref: e.target.value }))
                                  }
                                  onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                                  onClick={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                                  style={{
                                    flex: 1,
                                    padding: "0.3rem 0.5rem",
                                    border: "1px solid var(--border-main)",
                                    fontSize: "0.78rem",
                                    fontFamily: "var(--font-mono)",
                                    backgroundColor: "var(--bg-surface)",
                                    color: "var(--text-main)",
                                    cursor: "pointer",
                                  }}
                                >
                                  {schemaNames.map((n) => (
                                    <option key={n} value={`#/components/schemas/${n}`}>
                                      #/components/schemas/{n}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "0.4rem" }}>
                                {propDef.schema_type === "string" && (
                                  <>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                      <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 700 }}>
                                        FORMAT:
                                      </span>
                                      <select
                                        value={propDef.format ?? ""}
                                        onChange={(e) =>
                                          updateProperty(propName, (p) => ({
                                            ...p,
                                            format: e.target.value || undefined,
                                          }))
                                        }
                                        onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                                        onClick={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                                        style={{
                                          padding: "0.3rem 1.8rem 0.3rem 0.65rem",
                                          fontSize: "0.74rem",
                                          border: "1px solid var(--border-subtle)",
                                          backgroundColor: "var(--bg-surface)",
                                          color: "var(--text-main)",
                                          fontFamily: "var(--font-mono)",
                                          cursor: "pointer",
                                          minWidth: "125px",
                                          height: "28px",
                                        }}
                                      >
                                        <option value="">(ninguno)</option>
                                        <option value="uuid">uuid</option>
                                        <option value="date-time">date-time</option>
                                        <option value="date">date</option>
                                        <option value="email">email</option>
                                        <option value="uri">uri</option>
                                        <option value="ipv4">ipv4</option>
                                        <option value="ipv6">ipv6</option>
                                      </select>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                      <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 700 }}>MIN:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="—"
                                        value={propDef.min_length ?? ""}
                                        onChange={(e) =>
                                          updateProperty(propName, (p) => ({
                                            ...p,
                                            min_length: e.target.value ? Number(e.target.value) : undefined,
                                          }))
                                        }
                                        style={{
                                          width: "55px",
                                          height: "28px",
                                          padding: "0.25rem 0.4rem",
                                          fontSize: "0.72rem",
                                          border: "1px solid var(--border-subtle)",
                                          backgroundColor: "var(--bg-surface)",
                                          color: "var(--text-main)",
                                          fontFamily: "var(--font-mono)",
                                          textAlign: "center",
                                        }}
                                      />
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                      <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 700 }}>MAX:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="—"
                                        value={propDef.max_length ?? ""}
                                        onChange={(e) =>
                                          updateProperty(propName, (p) => ({
                                            ...p,
                                            max_length: e.target.value ? Number(e.target.value) : undefined,
                                          }))
                                        }
                                        style={{
                                          width: "55px",
                                          height: "28px",
                                          padding: "0.25rem 0.4rem",
                                          fontSize: "0.72rem",
                                          border: "1px solid var(--border-subtle)",
                                          backgroundColor: "var(--bg-surface)",
                                          color: "var(--text-main)",
                                          fontFamily: "var(--font-mono)",
                                          textAlign: "center",
                                        }}
                                      />
                                    </div>
                                  </>
                                )}

                                {(propDef.schema_type === "integer" || propDef.schema_type === "number") && (
                                  <>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                      <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 700 }}>MIN:</span>
                                      <input
                                        type="number"
                                        placeholder="—"
                                        value={propDef.minimum ?? ""}
                                        onChange={(e) =>
                                          updateProperty(propName, (p) => ({
                                            ...p,
                                            minimum: e.target.value ? Number(e.target.value) : undefined,
                                          }))
                                        }
                                        style={{
                                          width: "60px",
                                          height: "28px",
                                          padding: "0.25rem 0.4rem",
                                          fontSize: "0.72rem",
                                          border: "1px solid var(--border-subtle)",
                                          backgroundColor: "var(--bg-surface)",
                                          color: "var(--text-main)",
                                          fontFamily: "var(--font-mono)",
                                          textAlign: "center",
                                        }}
                                      />
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                      <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 700 }}>MAX:</span>
                                      <input
                                        type="number"
                                        placeholder="—"
                                        value={propDef.maximum ?? ""}
                                        onChange={(e) =>
                                          updateProperty(propName, (p) => ({
                                            ...p,
                                            maximum: e.target.value ? Number(e.target.value) : undefined,
                                          }))
                                        }
                                        style={{
                                          width: "60px",
                                          height: "28px",
                                          padding: "0.25rem 0.4rem",
                                          fontSize: "0.72rem",
                                          border: "1px solid var(--border-subtle)",
                                          backgroundColor: "var(--bg-surface)",
                                          color: "var(--text-main)",
                                          fontFamily: "var(--font-mono)",
                                          textAlign: "center",
                                        }}
                                      />
                                    </div>
                                  </>
                                )}

                                {propDef.schema_type === "array" && (
                                  <div
                                    style={{
                                      width: "100%",
                                      display: "flex",
                                      flexWrap: "wrap",
                                      alignItems: "center",
                                      gap: "0.6rem",
                                      backgroundColor: "var(--bg-surface)",
                                      border: "1px dashed var(--border-main)",
                                      padding: "0.45rem 0.65rem",
                                      marginTop: "0.2rem",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                      <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 800 }}>
                                        TIPO DE ITEMS:
                                      </span>
                                      <select
                                        value={
                                          propDef.items?.$ref
                                            ? "ref"
                                            : (propDef.items?.schema_type ?? "string")
                                        }
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "ref") {
                                            const firstOther = schemaNames.find((n) => n !== selectedSchemaName) ?? schemaNames[0] ?? "Schema";
                                            updateProperty(propName, (p) => ({
                                              ...p,
                                              items: { $ref: `#/components/schemas/${firstOther}` },
                                            }));
                                          } else {
                                            updateProperty(propName, (p) => ({
                                              ...p,
                                              items: {
                                                schema_type: val as SchemaDefinition["schema_type"],
                                                format: val === "string" ? p.items?.format : undefined,
                                              },
                                            }));
                                          }
                                        }}
                                        onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                                        onClick={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                                        style={{
                                          padding: "0.25rem 0.6rem",
                                          fontSize: "0.74rem",
                                          border: "1px solid var(--border-subtle)",
                                          backgroundColor: "var(--bg-app)",
                                          color: "var(--text-main)",
                                          fontFamily: "var(--font-mono)",
                                          cursor: "pointer",
                                          height: "28px",
                                        }}
                                      >
                                        <option value="string">string (Texto)</option>
                                        <option value="integer">integer (Entero)</option>
                                        <option value="number">number (Decimal)</option>
                                        <option value="boolean">boolean (Booleano)</option>
                                        <option value="object">object (Genérico)</option>
                                        <option value="ref">$ref (Referencia a Esquema)</option>
                                      </select>
                                    </div>

                                    {propDef.items?.$ref !== undefined && (
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                        <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 700 }}>
                                          ESQUEMA:
                                        </span>
                                        <select
                                          value={propDef.items.$ref}
                                          onChange={(e) => {
                                            const newRef = e.target.value;
                                            updateProperty(propName, (p) => ({
                                              ...p,
                                              items: { $ref: newRef },
                                            }));
                                          }}
                                          onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                                          onClick={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                                          style={{
                                            padding: "0.25rem 0.6rem",
                                            fontSize: "0.74rem",
                                            border: "1px solid var(--border-subtle)",
                                            backgroundColor: "var(--bg-app)",
                                            color: "var(--text-main)",
                                            fontFamily: "var(--font-mono)",
                                            cursor: "pointer",
                                            height: "28px",
                                          }}
                                        >
                                          {schemaNames.map((n) => (
                                            <option key={n} value={`#/components/schemas/${n}`}>
                                              #/components/schemas/{n}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    )}

                                    {propDef.items?.schema_type === "string" && !propDef.items?.$ref && (
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                        <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 700 }}>
                                          FORMAT:
                                        </span>
                                        <select
                                          value={propDef.items?.format ?? ""}
                                          onChange={(e) => {
                                            const fmt = e.target.value || undefined;
                                            updateProperty(propName, (p) => ({
                                              ...p,
                                              items: { ...p.items, format: fmt },
                                            }));
                                          }}
                                          onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                                          onClick={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                                          style={{
                                            padding: "0.25rem 0.6rem",
                                            fontSize: "0.74rem",
                                            border: "1px solid var(--border-subtle)",
                                            backgroundColor: "var(--bg-app)",
                                            color: "var(--text-main)",
                                            fontFamily: "var(--font-mono)",
                                            cursor: "pointer",
                                            height: "28px",
                                          }}
                                        >
                                          <option value="">(ninguno)</option>
                                          <option value="date">date (YYYY-MM-DD)</option>
                                          <option value="date-time">date-time</option>
                                          <option value="uuid">uuid</option>
                                          <option value="email">email</option>
                                          <option value="uri">uri</option>
                                        </select>
                                      </div>
                                    )}

                                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                      <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 700 }}>MIN ITMS:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="—"
                                        value={propDef.min_items ?? ""}
                                        onChange={(e) =>
                                          updateProperty(propName, (p) => ({
                                            ...p,
                                            min_items: e.target.value ? Number(e.target.value) : undefined,
                                          }))
                                        }
                                        style={{
                                          width: "55px",
                                          height: "28px",
                                          padding: "0.2rem 0.35rem",
                                          fontSize: "0.72rem",
                                          border: "1px solid var(--border-subtle)",
                                          backgroundColor: "var(--bg-app)",
                                          color: "var(--text-main)",
                                          fontFamily: "var(--font-mono)",
                                          textAlign: "center",
                                        }}
                                      />
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                      <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 700 }}>MAX ITMS:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="—"
                                        value={propDef.max_items ?? ""}
                                        onChange={(e) =>
                                          updateProperty(propName, (p) => ({
                                            ...p,
                                            max_items: e.target.value ? Number(e.target.value) : undefined,
                                          }))
                                        }
                                        style={{
                                          width: "55px",
                                          height: "28px",
                                          padding: "0.2rem 0.35rem",
                                          fontSize: "0.72rem",
                                          border: "1px solid var(--border-subtle)",
                                          backgroundColor: "var(--bg-app)",
                                          color: "var(--text-main)",
                                          fontFamily: "var(--font-mono)",
                                          textAlign: "center",
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div style={{ flex: 1, minWidth: "180px" }}>
                                  <input
                                    type="text"
                                    placeholder="Descripción del campo..."
                                    value={propDef.description ?? ""}
                                    onChange={(e) =>
                                      updateProperty(propName, (p) => ({
                                        ...p,
                                        description: e.target.value || undefined,
                                      }))
                                    }
                                    style={{
                                      width: "100%",
                                      padding: "0.2rem 0.4rem",
                                      fontSize: "0.72rem",
                                      border: "1px solid var(--border-subtle)",
                                      backgroundColor: "var(--bg-surface)",
                                      color: "var(--text-main)",
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* Espaciador inferior para garantizar holgura completa de scroll y dropdowns */}
                      <div style={{ height: "14rem" }} />
                    </div>
                  )}
                </div>
              )}

              {/* Vista Previa JSON Schema */}
              {showJsonPreview && (
                <div
                  style={{
                    backgroundColor: "#060709",
                    color: "var(--accent-citron)",
                    border: "2px solid #000000",
                    padding: "1rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.78rem",
                    overflowX: "auto",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.3rem" }}>
                    <span style={{ color: "var(--primary)", fontWeight: 800 }}>
                      // GENERATED OPENAPI 3.1 SCHEMA
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#8b92a3" }}>
                      #/components/schemas/{selectedSchemaName}
                    </span>
                  </div>
                  <pre>{JSON.stringify(selectedSchema, null, 2)}</pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                backgroundColor: "var(--bg-surface)",
                border: "2px solid var(--border-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
              }}
            >
              <Boxes size={28} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "0.3rem" }}>
                Ningún Esquema Seleccionado
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "420px" }}>
                Selecciona un esquema de la columna izquierda o crea uno nuevo para modelar propiedades y tipos de datos.
              </p>
            </div>
            {schemaNames.length === 0 && (
              <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  onClick={handleLoadSampleSchemas}
                  style={{
                    padding: "0.6rem 1.25rem",
                    backgroundColor: "var(--primary)",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px 0px #000000",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: "pointer",
                  }}
                >
                  <Sparkles size={14} style={{ color: "var(--accent-citron)" }} />
                  CARGAR EJEMPLO (VEHICLE / WORKORDER)
                </button>

                <button
                  onClick={handleLoadAnimalSchemas}
                  style={{
                    padding: "0.6rem 1.25rem",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-main)",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    border: "2px solid var(--border-strong)",
                    boxShadow: "2px 2px 0px 0px var(--border-strong)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: "pointer",
                  }}
                >
                  <GitFork size={14} style={{ color: "var(--primary)" }} />
                  CARGAR MODELO ANIMALES (HERENCIA allOf & ARRAYS)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Crear Nuevo Esquema */}
      {newSchemaModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "2px solid var(--border-strong)",
              boxShadow: "6px 6px 0px 0px #000000",
              padding: "1.5rem",
              width: "420px",
              maxWidth: "90%",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 900, textTransform: "uppercase" }}>
                Nuevo Esquema Reutilizable
              </h3>
              <button
                onClick={() => {
                  setNewSchemaModalOpen(false);
                  setNewSchemaError(null);
                }}
                style={{ color: "var(--text-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            {newSchemaError && (
              <div
                style={{
                  padding: "0.5rem 0.8rem",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "var(--error)",
                  border: "1px solid var(--error)",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  marginBottom: "1rem",
                }}
              >
                [ERROR] {newSchemaError}
              </div>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.3rem" }}>
                NOMBRE DEL ESQUEMA (PASCALCASE)
              </label>
              <input
                type="text"
                placeholder="ej. Customer, RepairOrder, Part"
                value={newSchemaName}
                onChange={(e) => setNewSchemaName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSchema();
                  if (e.key === "Escape") setNewSchemaModalOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "2px solid var(--border-main)",
                  backgroundColor: "var(--bg-app)",
                  color: "var(--text-main)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.3rem" }}>
                TIPO BASE DE ESQUEMA
              </label>
              <select
                value={newSchemaType}
                onChange={(e) =>
                  setNewSchemaType(e.target.value as "object" | "string" | "integer" | "number" | "boolean" | "array")
                }
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "2px solid var(--border-main)",
                  backgroundColor: "var(--bg-app)",
                  color: "var(--text-main)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                }}
              >
                <option value="object">object (Entidad con propiedades)</option>
                <option value="string">string (Texto primitivo o enum)</option>
                <option value="integer">integer (Número entero)</option>
                <option value="number">number (Número decimal)</option>
                <option value="boolean">boolean (Booleano)</option>
                <option value="array">array (Lista de elementos)</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <button
                onClick={() => {
                  setNewSchemaModalOpen(false);
                  setNewSchemaError(null);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  border: "2px solid var(--border-subtle)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                }}
              >
                CANCELAR
              </button>
              <button
                onClick={handleCreateSchema}
                style={{
                  padding: "0.5rem 1.25rem",
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  border: "2px solid #000000",
                }}
              >
                CREAR ESQUEMA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Eliminación con Detección de Dependencias */}
      {deleteCandidate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "2px solid var(--border-strong)",
              boxShadow: "6px 6px 0px 0px #000000",
              padding: "1.5rem",
              width: "480px",
              maxWidth: "90%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.8rem" }}>
              <AlertTriangle size={20} style={{ color: "var(--error)" }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 900, color: "var(--error)", textTransform: "uppercase" }}>
                Eliminar Esquema &apos;{deleteCandidate}&apos;
              </h3>
            </div>

            {isCheckingUsages ? (
              <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                // COMPROBANDO REFERENCIAS CRUZADAS EN CONTRATO...
              </div>
            ) : deleteUsages.length > 0 ? (
              <div style={{ marginBottom: "1.2rem" }}>
                <p style={{ fontSize: "0.82rem", marginBottom: "0.6rem", color: "var(--text-main)" }}>
                  <strong>¡ATENCIÓN!</strong> Este componente está referenciado por las siguientes partes del contrato:
                </p>
                <div
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    padding: "0.6rem 0.8rem",
                    maxHeight: "140px",
                    overflowY: "auto",
                    fontSize: "0.78rem",
                    fontFamily: "var(--font-mono)",
                    marginBottom: "0.8rem",
                  }}
                >
                  {deleteUsages.map((usage, idx) => (
                    <div key={idx} style={{ marginBottom: "0.2rem" }}>
                      • {usage}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  Si eliminas &apos;{deleteCandidate}&apos;, estas dependencias quedarán con referencias rotas (STRUCT-003).
                </p>
              </div>
            ) : (
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1.2rem" }}>
                Este esquema no tiene dependencias activas registradas. ¿Deseas confirmar la eliminación?
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <button
                onClick={() => {
                  setDeleteCandidate(null);
                  setDeleteUsages([]);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  border: "2px solid var(--border-subtle)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-main)",
                }}
              >
                CANCELAR
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: "0.5rem 1.25rem",
                  backgroundColor: "var(--error)",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  border: "2px solid #000000",
                }}
              >
                {deleteUsages.length > 0 ? "ELIMINAR DE TODOS MODOS" : "CONFIRMAR BORRADO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Renombrar Esquema (con refactorización automática de $ref) */}
      {isRenameModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "2px solid var(--border-strong)",
              boxShadow: "6px 6px 0px 0px var(--border-strong)",
              width: "480px",
              padding: "1.6rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Pencil size={18} color="var(--primary)" />
                <h3
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 900,
                    fontSize: "0.95rem",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  RENOMBRAR ESQUEMA
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsRenameModalOpen(false);
                  setRenameError(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {renameError && (
              <div
                style={{
                  backgroundColor: "rgba(255, 23, 68, 0.12)",
                  border: "1.5px solid #ff1744",
                  padding: "0.6rem 0.8rem",
                  fontSize: "0.75rem",
                  color: "#ff1744",
                  marginBottom: "1rem",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {renameError}
              </div>
            )}

            <div style={{ marginBottom: "1.2rem" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  marginBottom: "0.4rem",
                }}
              >
                NUEVO NOMBRE DEL ESQUEMA (PASCALCASE)
              </label>
              <input
                type="text"
                value={newSchemaTargetName}
                onChange={(e) => setNewSchemaTargetName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleExecuteRename(schemaToRename, newSchemaTargetName);
                  if (e.key === "Escape") {
                    setIsRenameModalOpen(false);
                    setRenameError(null);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.8rem",
                  backgroundColor: "var(--bg-app)",
                  border: "2px solid var(--border-main)",
                  color: "var(--text-main)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                }}
              />
            </div>

            <div
              style={{
                padding: "0.7rem 0.9rem",
                backgroundColor: "rgba(212, 255, 0, 0.08)",
                border: "1.5px solid var(--accent-citron)",
                fontSize: "0.72rem",
                lineHeight: 1.45,
                marginBottom: "1.4rem",
                color: "var(--text-main)",
              }}
            >
              <strong>Refactorización automática:</strong> Al renombrar <code>{schemaToRename}</code> a <code>{newSchemaTargetName || "..."}</code>, CAAD actualizará automáticamente todas las referencias internas (<code>$ref: #/components/schemas/{schemaToRename}</code>) en otros esquemas, parámetros, cuerpos de petición y respuestas de toda la API.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <button
                onClick={() => {
                  setIsRenameModalOpen(false);
                  setRenameError(null);
                }}
                style={{
                  padding: "0.5rem 0.9rem",
                  backgroundColor: "transparent",
                  border: "2px solid var(--border-main)",
                  color: "var(--text-main)",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                CANCELAR
              </button>

              <button
                onClick={() => handleExecuteRename(schemaToRename, newSchemaTargetName)}
                style={{
                  padding: "0.5rem 1.1rem",
                  backgroundColor: "var(--primary)",
                  color: "#000000",
                  border: "2px solid #000000",
                  boxShadow: "2px 2px 0px 0px #000000",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                CONFIRMAR Y REFACTORIZAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
