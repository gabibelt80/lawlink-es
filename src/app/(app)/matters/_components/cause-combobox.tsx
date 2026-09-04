"use client";

import { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { ChevronRight, ChevronsUpDown, Loader2, X } from "lucide-react";
import type { MatterCategory, ProcedureType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { searchCauses, type CauseSearchResult } from "@/server/causes/actions";
import { causeScopeForSelection } from "@/lib/cause-scope";
import { cn } from "@/lib/utils";

type Node = CauseSearchResult;

type Props = {
  value: string;
  onChange: (id: string, name: string) => void;
  category: MatterCategory;
  procedureType?: ProcedureType | null;
  disabled?: boolean;
  placeholder?: string;
  triggerClassName?: string;
};

export function CauseCombobox({
  value,
  onChange,
  category,
  procedureType,
  disabled,
  placeholder = "Seleccionar",
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedName, setSelectedName] = useState<string>("");

  const [pickedL2, setPickedL2] = useState<string | null>(null);
  const [pickedL3, setPickedL3] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState<string>("");

  const causeScopeKey = useMemo(() => {
    const scope = causeScopeForSelection(category, procedureType);
    return [
      scope.dbCategory,
      scope.includeCodePrefixes?.join(",") ?? "*",
      scope.excludeCodePrefixes.join(","),
    ].join("|");
  }, [category, procedureType]);
  const previousCauseScopeKey = useRef(causeScopeKey);

  function handleOpen(o: boolean) {
    setOpen(o);
    if (o) {
      setPickedL2(null);
      setPickedL3(null);
      setSearchInput("");
      if (allNodes.length === 0) {
        startTransition(async () => {
          const data = await searchCauses({
            category,
            procedureType,
            limit: 2000,
          });
          setAllNodes(data);
        });
      }
    }
  }

  useEffect(() => {
    if (previousCauseScopeKey.current === causeScopeKey) return;
    previousCauseScopeKey.current = causeScopeKey;
    setAllNodes([]);
    if (value) {
      onChange("", "");
      setSelectedName("");
    }
  }, [causeScopeKey]);

  useEffect(() => {
    if (value && allNodes.length > 0) {
      const found = allNodes.find((o) => o.id === value);
      if (found) {
        setSelectedName(found.name);
      }
    }
  }, [value, allNodes]);

  const l2Nodes = useMemo(() => {
    const level2 = allNodes.filter((n) => n.level === 2);
    if (level2.length > 0) return level2;
    return allNodes.filter((n) => n.level === 1);
  }, [allNodes]);

  const l3Nodes = useMemo(
    () =>
      pickedL2
        ? allNodes.filter((n) => n.level === 3 && n.parentId === pickedL2)
        : [],
    [allNodes, pickedL2],
  );
  const l4Nodes = useMemo(
    () =>
      pickedL3
        ? allNodes.filter((n) => n.level === 4 && n.parentId === pickedL3)
        : [],
    [allNodes, pickedL3],
  );

  const searchMatched = useMemo(() => {
    const q = searchInput.trim();
    if (!q) return null;
    const lower = q.toLowerCase();
    return allNodes
      .filter((n) => n.level >= 1 && n.name.toLowerCase().includes(lower))
      .slice(0, 60);
  }, [allNodes, searchInput]);

  function hasChildren(n: Node) {
    return allNodes.some((x) => x.parentId === n.id);
  }

  function selectNode(node: Node, level: number) {
    onChange(node.id, node.name);
    setSelectedName(node.name);
    if (hasChildren(node)) {
      if (level === 1 || level === 2) {
        setPickedL2(node.id);
        setPickedL3(null);
      } else if (level === 3) {
        setPickedL3(node.id);
      }
    } else {
      setOpen(false);
    }
  }

  function pickNode(node: Node) {
    onChange(node.id, node.name);
    setSelectedName(node.name);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-10 w-full justify-between rounded-sm font-normal",
            triggerClassName,
          )}
        >
          {value && selectedName ? (
            <span className="truncate">{selectedName}</span>
          ) : (
            <span className="truncate text-muted-foreground">
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        avoidCollisions={false}
        portalled={false}
        className="w-auto max-w-[92vw] p-0"
      >
        <div className="border-b border-border p-2">
          <div className="relative w-[240px]">
            <Input
              placeholder="Buscar causa"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 pr-7 text-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {isPending ? (
          <div className="flex w-[240px] items-center justify-center py-10 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="ml-2">Cargando catalogo de causas...</span>
          </div>
        ) : searchMatched ? (
          <div className="max-h-[360px] w-[320px] overflow-y-auto p-1">
            {searchMatched.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No se encontraron coincidencias
              </p>
            ) : (
              searchMatched.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => pickNode(n)}
                  title={n.name}
                  className="flex min-h-8 w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted hover:text-foreground"
                >
                  <span className="truncate">{n.name}</span>
                  <span className="shrink-0 text-[10.5px] text-muted-foreground">
                    {n.l2Name ?? ""}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="flex divide-x divide-border">
            {l2Nodes.length > 0 && (
              <Column
                title="Categoria"
                items={l2Nodes}
                activeId={pickedL2}
                hasChildren={hasChildren}
                onPick={(n) => selectNode(n, n.level)}
              />
            )}
            {pickedL2 && l3Nodes.length > 0 && (
              <Column
                title="Subcategoria"
                items={l3Nodes}
                activeId={pickedL3}
                empty="Sin subcategorias"
                hasChildren={hasChildren}
                onPick={(n) => selectNode(n, 3)}
              />
            )}
            {pickedL3 && l4Nodes.length > 0 && (
              <Column
                title="Detalle"
                items={l4Nodes}
                activeId={null}
                hasChildren={() => false}
                onPick={(n) => selectNode(n, 4)}
              />
            )}
            {l2Nodes.length === 0 && !isPending && (
              <p className="w-[240px] px-4 py-6 text-center text-xs text-muted-foreground">
                No hay causas cargadas para esta categoria
              </p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Column({
  title,
  items,
  activeId,
  empty = "—",
  hasChildren,
  onPick,
}: {
  title: string;
  items: Node[];
  activeId: string | null;
  empty?: string;
  hasChildren: (n: Node) => boolean;
  onPick: (n: Node) => void;
}) {
  return (
    <div className="flex max-h-[360px] w-[176px] flex-col">
      <div className="border-b border-border bg-muted/30 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {items.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-muted-foreground/60">
            {empty}
          </p>
        ) : (
          items.map((n) => {
            const branching = hasChildren(n);
            const isActive = activeId === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => onPick(n)}
                title={n.name}
                className={cn(
                  "flex min-h-8 w-full items-center justify-between gap-1 rounded-sm px-2 py-1.5 text-left text-[13px] transition-colors",
                  isActive
                    ? "bg-accent text-primary"
                    : "hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="truncate">{n.name}</span>
                <ChevronRight
                  className={cn(
                    "h-3 w-3 shrink-0 text-muted-foreground/50",
                    isActive && "text-primary",
                    !branching && "invisible",
                  )}
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}