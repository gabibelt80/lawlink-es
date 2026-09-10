"use client";

import { useState, useTransition, useCallback } from "react";
import { toast } from "sonner";
import {
  FolderOpen,
  FileText,
  Download,
  CheckSquare,
  Square,
  ChevronRight,
  ChevronDown,
  Loader2,
  History,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  listCaseFolders,
  logDownloadAction,
  getDownloadLogs,
} from "@/server/archive/explorer-actions";

type FolderItem = {
  id: string;
  name: string;
  orderIndex: number;
  documents: DocItem[];
};

type DocItem = {
  id: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  folderId: string | null;
};

type CaseFolder = {
  id: string;
  internalCode: string;
  firmCaseNo: string | null;
  title: string;
  status: string;
  archivedAt: Date | null;
  folders: FolderItem[];
  rootDocuments: DocItem[];
};

type Selection = {
  type: "file" | "folder";
  id: string;
  name: string;
  matterId: string;
  matterTitle: string;
};

type DownloadLog = {
  id: string;
  createdAt: Date;
  user: string;
  detail: any;
};

export function ArchiveExplorer() {
  const [cases, setCases] = useState<CaseFolder[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<DownloadLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Cargar casos
  const loadCases = useCallback(async () => {
    try {
      const data = await listCaseFolders();
      setCases(data as CaseFolder[]);
      // Expandir todos por defecto
      setExpanded(new Set(data.map((c) => c.id)));
    } catch (err) {
      toast.error("Error cargando carpetas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useState(() => {
    loadCases();
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(sel: Selection) {
    const key = `${sel.type}:${sel.id}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectFolder(folder: FolderItem, matter: CaseFolder) {
    const folderKey = `folder:${folder.id}`;
    const allDocsSelected = folder.documents.every((doc) =>
      selected.has(`file:${doc.id}`)
    );

    if (allDocsSelected) {
      // Deseleccionar folder y todos sus docs
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(folderKey);
        folder.documents.forEach((doc) => next.delete(`file:${doc.id}`));
        return next;
      });
    } else {
      // Seleccionar folder y todos sus docs
      setSelected((prev) => {
        const next = new Set(prev);
        next.add(folderKey);
        folder.documents.forEach((doc) => next.add(`file:${doc.id}`));
        return next;
      });
    }
  }

  function toggleSelectCase(matter: CaseFolder) {
    const allItems = [
      ...matter.rootDocuments.map((d) => `file:${d.id}`),
      ...matter.folders.flatMap((f) => [
        `folder:${f.id}`,
        ...f.documents.map((d) => `file:${d.id}`),
      ]),
    ];

    const allSelected = allItems.every((key) => selected.has(key));

    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        allItems.forEach((key) => next.delete(key));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        allItems.forEach((key) => next.add(key));
        return next;
      });
    }
  }

  function downloadSelected() {
    startTransition(async () => {
      const selectedItems: Selection[] = [];
      
      for (const key of selected) {
        const [type, id] = key.split(":");
        // Buscar en qué caso está
        for (const matter of cases) {
          if (type === "file") {
            const doc = matter.rootDocuments.find((d) => d.id === id) ||
              matter.folders.flatMap((f) => f.documents).find((d) => d.id === id);
            if (doc) {
              selectedItems.push({
                type: "file",
                id: doc.id,
                name: doc.name,
                matterId: matter.id,
                matterTitle: matter.title,
              });
              break;
            }
          } else {
            const folder = matter.folders.find((f) => f.id === id);
            if (folder) {
              selectedItems.push({
                type: "folder",
                id: folder.id,
                name: folder.name,
                matterId: matter.id,
                matterTitle: matter.title,
              });
              break;
            }
          }
        }
      }

      if (selectedItems.length === 0) {
        toast.error("No hay elementos seleccionados");
        return;
      }

      // Descargar: archivos individuales, carpetas como ZIP
      for (const item of selectedItems) {
        if (item.type === "file") {
          window.open(`/api/documents/${item.id}/download`, "_blank");
        } else {
          window.open(`/api/archive/folder/${item.id}/download`, "_blank");
        }
      }

      // Registrar log
      await logDownloadAction({
        matterId: selectedItems[0].matterId,
        matterTitle: selectedItems[0].matterTitle,
        items: selectedItems.map((s) => ({ id: s.id, name: s.name, type: s.type })),
      });

      toast.success(`${selectedItems.length} elemento(s) descargado(s)`);
      setSelected(new Set());
    });
  }

  function loadLogs() {
    startTransition(async () => {
      try {
        const data = await getDownloadLogs();
        setLogs(data as DownloadLog[]);
        setShowLog(true);
      } catch (err) {
        toast.error("Error cargando log de descargas");
      }
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {selected.size > 0 ? `${selected.size} elemento(s) seleccionado(s)` : "Seleccioná carpetas o archivos para descargar"}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadLogs}
            className="gap-1.5"
          >
            <History className="h-3.5 w-3.5" />
            Ver log de descargas
          </Button>
          <Button
            size="sm"
            onClick={downloadSelected}
            disabled={selected.size === 0 || isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Descargar seleccionados
          </Button>
        </div>
      </div>

      {/* Log de descargas */}
      {showLog && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Log de descargas</h3>
            <button onClick={() => setShowLog(false)} className="p-1 rounded hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay descargas registradas.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="text-xs border-b border-border/50 pb-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{log.user}</span>
                    <span className="text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    {log.detail?.matterTitle ?? "Caso"} - {log.detail?.downloadedItems?.length ?? 0} elemento(s)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista de casos */}
      {cases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
          No hay casos archivados con documentos. Archivá casos para ver sus carpetas aquí.
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((matter) => {
            const isCaseExpanded = expanded.has(matter.id);
            const allItems = [
              ...matter.rootDocuments.map((d) => `file:${d.id}`),
              ...matter.folders.flatMap((f) => [
                `folder:${f.id}`,
                ...f.documents.map((d) => `file:${d.id}`),
              ]),
            ];
            const allSelected = allItems.length > 0 && allItems.every((key) => selected.has(key));

            return (
              <div key={matter.id} className="rounded-xl border border-border bg-card">
                {/* Header del caso */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                  <button
                    onClick={() => toggleExpand(matter.id)}
                    className="p-1 rounded hover:bg-muted"
                  >
                    {isCaseExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleSelectCase(matter)}
                    className="p-1 rounded hover:bg-muted"
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{matter.title}</span>
                      {matter.status === "ARCHIVED" ? (
                        <span className="shrink-0 rounded-full bg-purple-500/15 px-2 py-0.5 text-[9px] font-medium text-purple-700">
                          Archivado
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-medium text-emerald-700">
                          Activo
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {matter.firmCaseNo ?? matter.internalCode}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {allItems.length} elemento(s)
                  </span>
                </div>

                {/* Contenido expandido */}
                {isCaseExpanded && (
                  <div className="px-4 py-3 space-y-2">
                    {/* Documentos raíz */}
                    {matter.rootDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                          selected.has(`file:${doc.id}`) ? "bg-primary/5" : "hover:bg-muted/50"
                        )}
                      >
                        <button
                          onClick={() => toggleSelect({
                            type: "file",
                            id: doc.id,
                            name: doc.name,
                            matterId: matter.id,
                            matterTitle: matter.title,
                          })}
                          className="p-0.5"
                        >
                          {selected.has(`file:${doc.id}`) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs flex-1 truncate">{doc.name}</span>
                        {doc.size && (
                          <span className="text-[10px] text-muted-foreground">
                            {(doc.size / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                    ))}

                    {/* Carpetas */}
                    {matter.folders.map((folder) => {
                      const isFolderExpanded = expanded.has(`folder:${folder.id}`);
                      const allFolderDocsSelected = folder.documents.length > 0 &&
                        folder.documents.every((doc) => selected.has(`file:${doc.id}`));

                      return (
                        <div key={folder.id}>
                          <div
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                              selected.has(`folder:${folder.id}`) ? "bg-primary/5" : "hover:bg-muted/50"
                            )}
                          >
                            <button
                              onClick={() => toggleExpand(`folder:${folder.id}`)}
                              className="p-0.5"
                            >
                              {isFolderExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              onClick={() => toggleSelectFolder(folder, matter)}
                              className="p-0.5"
                            >
                              {allFolderDocsSelected ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="text-xs font-medium flex-1 truncate">{folder.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {folder.documents.length} doc(s)
                            </span>
                          </div>

                          {/* Docs de la carpeta */}
                          {isFolderExpanded && folder.documents.length > 0 && (
                            <div className="ml-8 mt-1 space-y-1">
                              {folder.documents.map((doc) => (
                                <div
                                  key={doc.id}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded transition-colors",
                                    selected.has(`file:${doc.id}`) ? "bg-primary/5" : "hover:bg-muted/50"
                                  )}
                                >
                                  <button
                                    onClick={() => toggleSelect({
                                      type: "file",
                                      id: doc.id,
                                      name: doc.name,
                                      matterId: matter.id,
                                      matterTitle: matter.title,
                                    })}
                                    className="p-0.5"
                                  >
                                    {selected.has(`file:${doc.id}`) ? (
                                      <CheckSquare className="h-3.5 w-3.5 text-primary" />
                                    ) : (
                                      <Square className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                  </button>
                                  <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-[11px] flex-1 truncate">{doc.name}</span>
                                  {doc.size && (
                                    <span className="text-[9px] text-muted-foreground">
                                      {(doc.size / 1024).toFixed(0)} KB
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
