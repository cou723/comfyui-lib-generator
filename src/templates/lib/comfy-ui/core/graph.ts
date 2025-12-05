import {
  AnyNodeDef,
  AnyNodeHandle,
  AnySubgraphDef,
  BuildArgs,
  InputArg,
  InputSpec,
  Kind,
  NodeDef,
  NodeHandle,
  Out,
  OutputSpec,
  SubgraphDef,
  SubgraphHandle,
} from "./types.ts";

type PromptNode = {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: { title?: string };
};

export class GraphBuilder {
  private nodes: AnyNodeHandle[] = [];
  private nextId: number;
  private stableIds: boolean;

  constructor(opts?: { stableIds?: boolean; idStart?: number }) {
    this.stableIds = opts?.stableIds ?? true;
    this.nextId = opts?.idStart ?? 1;
  }

  add<D extends AnyNodeDef>(
    def: D,
    args: BuildArgs<D>,
    opt?: { label?: string },
  ): NodeHandle<D>;

  add<D extends AnySubgraphDef>(
    def: D,
    args: BuildArgs<D>,
    opt?: { label?: string },
  ): SubgraphHandle<D>;

  add(
    def: AnyNodeDef | AnySubgraphDef,
    args: BuildArgs<AnyNodeDef> | BuildArgs<AnySubgraphDef>,
    opt?: { label?: string },
  ): AnyNodeHandle | SubgraphHandle<AnySubgraphDef> {
    if (this.isSubgraphDef(def)) {
      return this.runSubgraph(def, args as BuildArgs<typeof def>, opt);
    }
    return this.addNode(def, args as BuildArgs<typeof def>, opt);
  }

  toPrompt(): Record<string, PromptNode> {
    const out: Record<string, PromptNode> = {};
    for (const h of this.nodes) {
      if (h.id == null) throw new Error("Node without id");
      const inputs = this.buildInputs(h);
      const meta = h.label ? { title: h.label } : undefined;
      out[String(h.id)] = {
        class_type: h.def.type,
        inputs,
        ...(meta ? { _meta: meta } : {}),
      } as PromptNode;
    }
    return out;
  }

  private allocId(): number {
    const id = this.nextId;
    this.nextId += 1;
    return id;
  }

  private addNode<D extends AnyNodeDef>(
    def: D,
    args: BuildArgs<D>,
    opt?: { label?: string },
  ): NodeHandle<D> {
    const handle = this.makeHandle(def, args, opt);
    this.nodes.push(handle);
    return handle;
  }

  private runSubgraph<D extends AnySubgraphDef>(
    def: D,
    args: BuildArgs<D>,
    opt?: { label?: string },
  ): SubgraphHandle<D> {
    const outputs = def.build(this, args) as ReturnType<D["build"]>;
    return {
      def,
      label: opt?.label,
      outputs: outputs as SubgraphHandle<D>["outputs"],
    };
  }

  private makeHandle<D extends AnyNodeDef>(
    def: D,
    args: BuildArgs<D>,
    opt?: { label?: string },
  ): NodeHandle<D> {
    this.validateArgs(def, args);
    const resolvedArgs = this.applyDefaults(def, args);
    const handle: NodeHandle<D> = {
      def,
      id: this.allocId(),
      label: opt?.label,
      args: resolvedArgs,
      outputs: Object.fromEntries(
        (Object.entries(def.outputs) as [
          keyof D["outputs"],
          OutputSpec<Kind>,
        ][]).map(([k, spec]) => [
          k,
          this.makeOut(spec.kind, spec.index),
        ]),
      ) as NodeHandle<D>["outputs"],
    };

    for (
      const key of Object.keys(handle.outputs) as Array<
        keyof typeof handle.outputs
      >
    ) {
      handle.outputs[key].node = handle;
    }

    return handle;
  }

  private applyDefaults<D extends AnyNodeDef>(
    def: D,
    args: BuildArgs<D>,
  ): BuildArgs<D> {
    const resolved = { ...args } as BuildArgs<D>;
    const specEntries = Object.entries(def.inputs) as [
      keyof D["inputs"],
      InputSpec<unknown>,
    ][];
    for (const [key, spec] of specEntries) {
      const argKey = key as keyof BuildArgs<D>;
      if (resolved[argKey] === undefined && spec.default !== undefined) {
        resolved[argKey] = spec.default as BuildArgs<D>[typeof argKey];
      }
    }
    return resolved;
  }

  private validateArgs<D extends AnyNodeDef>(def: D, args: BuildArgs<D>) {
  }

  private isSubgraphDef(
    def: AnyNodeDef | AnySubgraphDef,
  ): def is AnySubgraphDef {
    return "build" in def;
  }

  private makeOut<K extends Kind>(kind: K, index: number): Out<K> {
    // node property will be attached after handle construction
    return {
      kind,
      node: undefined as unknown as NodeHandle<AnyNodeDef>,
      index,
    };
  }

  private isOut(x: unknown): x is Out<Kind> {
    return !!x && typeof x === "object" && "index" in x && "kind" in x &&
      "node" in x;
  }

  private buildInputs<D extends AnyNodeDef>(
    h: NodeHandle<D>,
  ): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};
    const specEntries = Object.entries(h.def.inputs) as [
      keyof D["inputs"],
      InputSpec<unknown>,
    ][];
    for (const [key, spec] of specEntries) {
      const v = h.args[key as keyof BuildArgs<D>];

      if (v === undefined) {
        // if (spec.required && spec.default === undefined) {
        //   throw new Error(
        //     `Missing required input: ${String(key)} for ${h.def.type}`,
        //   );
        // }
        if (spec.default !== undefined) {
          inputs[String(key)] = spec.default;
        }
        continue;
      }

      // Connection vs scalar
      if (spec.kind) {
        inputs[String(key)] = this.serializeArg(
          spec.kind,
          v as InputArg<Kind, unknown>,
        );
      } else {
        inputs[String(key)] = v;
      }
    }
    return inputs;
  }

  private serializeArg<K extends Kind>(
    expected: K,
    arg: InputArg<K, unknown>,
  ): unknown {
    if (this.isOut(arg)) {
      // A connection
      const out = arg as Out<K>;
      if (out.kind !== expected) {
        throw new Error(`Kind mismatch: expected ${expected}, got ${out.kind}`);
      }
      const nodeId = out.node.id;
      if (nodeId == null) throw new Error("Connected output has no node id");
      return [String(nodeId), out.index] as [string, number];
    }
    return arg;
  }
}
