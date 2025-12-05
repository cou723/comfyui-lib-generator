// Core DSL types
import type { GeneratedKind } from "../generated/kinds.gen.ts";

export type Kind = GeneratedKind;

export interface NodeDef<
  Name extends string,
  Inputs extends Record<string, InputSpec<unknown>>,
  Outputs extends Record<string, OutputSpec<Kind>>,
> {
  type: Name; // ComfyUI class_type
  inputs: Inputs;
  outputs: Outputs;
}

export type InputSpec<T, R extends boolean = boolean> = {
  required: R;
  kind?: Kind; // when present, this input can accept a connection
  default?: T;
  enum?: readonly T[];
};

type ScalarInputSpec<T, R extends boolean = boolean> = {
  required: R;
  default?: T;
  enum?: readonly T[];
};

type ScalarInputValue<Spec, Fallback> = Spec extends { enum?: readonly (infer E)[] }
  ? E
  : Fallback;

type ConnectionInputSpec<K extends Kind, R extends boolean = boolean> = {
  required: R;
  kind: K;
  default?: unknown;
};

const makeScalarInput = <
  T,
  const Spec extends ScalarInputSpec<T>,
>(spec: Spec): InputSpec<ScalarInputValue<Spec, T>, Spec["required"]> =>
  spec as InputSpec<ScalarInputValue<Spec, T>, Spec["required"]>;

export const numberInput = <
  const Spec extends ScalarInputSpec<number>,
>(spec: Spec): InputSpec<ScalarInputValue<Spec, number>, Spec["required"]> =>
  makeScalarInput(spec);

export const stringInput = <
  const Spec extends ScalarInputSpec<string>,
>(spec: Spec): InputSpec<ScalarInputValue<Spec, string>, Spec["required"]> =>
  makeScalarInput(spec);

export const booleanInput = <
  const Spec extends ScalarInputSpec<boolean>,
>(spec: Spec): InputSpec<ScalarInputValue<Spec, boolean>, Spec["required"]> =>
  makeScalarInput(spec);

export const connectionInput = <
  K extends Kind,
  const Spec extends ConnectionInputSpec<K>,
>(
  spec: Spec,
): InputSpec<never, Spec["required"]> & { kind: K } =>
  spec as InputSpec<never, Spec["required"]> & { kind: K };

export type OutputSpec<K extends Kind> = {
  kind: K;
  index: number;
};

export type AnyNodeInputs = Record<string, InputSpec<unknown>>;
export type AnyNodeOutputs = Record<string, OutputSpec<Kind>>;
export type AnyNodeDef = NodeDef<string, AnyNodeInputs, AnyNodeOutputs>;
export type AnySubgraphDef = SubgraphDef<string, Record<string, unknown>, Record<string, Kind>>;

type InputSpecValue<S> = S extends InputSpec<infer T> ? T : unknown;
type InputSpecKind<S> = S extends { kind: infer Kd } ? Kd extends Kind ? Kd : never : never;
type OutputSpecKind<S> = S extends OutputSpec<infer K> ? K : never;

type InputTypeFromSpec<S> = InputSpecKind<S> extends never
  ? InputSpecValue<S>
  : InputArg<InputSpecKind<S>, InputSpecValue<S>>;

type RequiredInputKeys<Inputs extends Record<string, InputSpec<unknown>>> = {
  [K in keyof Inputs]-?: Inputs[K]["required"] extends true ? K : never;
}[keyof Inputs];

type OptionalInputKeys<Inputs extends Record<string, InputSpec<unknown>>> = {
  [K in keyof Inputs]-?: Inputs[K]["required"] extends true ? never : K;
}[keyof Inputs];

type NodeBuildArgs<D extends AnyNodeDef> =
  & { [K in RequiredInputKeys<D["inputs"]>]: InputTypeFromSpec<D["inputs"][K]> }
  & { [K in OptionalInputKeys<D["inputs"]>]?: InputTypeFromSpec<D["inputs"][K]> };

type SubgraphBuildArgs<D extends AnySubgraphDef> = D extends SubgraphDef<string, infer I, Record<string, Kind>> ? I : never;

export type BuildArgs<D extends AnyNodeDef | AnySubgraphDef> =
  D extends AnyNodeDef ? NodeBuildArgs<D>
    : D extends AnySubgraphDef ? SubgraphBuildArgs<D>
    : never;

export type InputArg<K extends Kind, T> = T | Out<K>;

export type Out<K extends Kind> = {
  kind: K;
  node: NodeHandle<AnyNodeDef>;
  index: number;
};

export interface NodeHandle<D extends AnyNodeDef> {
  def: D;
  id?: number;
  label?: string;
  args: BuildArgs<D>;
  outputs: { [K in keyof D["outputs"]]: Out<D["outputs"][K]["kind"]> };
}

export type AnyNodeHandle = NodeHandle<AnyNodeDef>;

type SubgraphResult<O extends Record<string, Kind>> = {
  [K in keyof O]: Out<O[K]>;
};

type SubgraphOutputKinds<D extends AnySubgraphDef> = D extends SubgraphDef<
  string,
  Record<string, unknown>,
  infer O
> ? O
  : never;

export interface SubgraphDef<
  Name extends string,
  I extends Record<string, unknown>,
  O extends Record<string, Kind>,
> {
  type: Name;
  inputs: { [K in keyof I]: InputSpec<I[K]> };
  outputs: { [K in keyof O]: SubgraphOutputSpec<O[K]> };
  build: (ctx: SubgraphContext, args: BuildArgs<SubgraphDef<Name, I, O>>) => SubgraphResult<O>;
}

export type SubgraphOutputSpec<K extends Kind> = {
  kind: K;
};

export interface SubgraphHandle<D extends AnySubgraphDef> {
  def: D;
  label?: string;
  outputs: SubgraphResult<SubgraphOutputKinds<D>>;
}

export interface SubgraphContext {
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
}

export const defineNode = <
  const Name extends string,
  const Inputs extends Record<string, InputSpec<unknown>>,
  const Outputs extends Record<string, OutputSpec<Kind>>,
>(
  def: {
    type: Name;
    inputs: Inputs;
    outputs: Outputs;
  },
): NodeDef<Name, Inputs, Outputs> => {
  return def as NodeDef<Name, Inputs, Outputs>;
};
