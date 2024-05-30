import transformers from "@kubb/core/transformers";
import {
  FunctionParams,
  URLPath,
  type FunctionParamsAST,
} from "@kubb/core/utils";
import { Parser, File, Function, Text, useApp } from "@kubb/react";
import { pluginTsName } from "@kubb/swagger-ts";
import { useOperation, useOperationManager } from "@kubb/plugin-oas/hooks";
import { getASTParams, getComments } from "@kubb/plugin-oas/utils";

import { SchemaType } from "./SchemaType.tsx";

import type { HttpMethod } from "@kubb/oas";
import type { ReactNode } from "react";
import type { FileMeta, PluginSwr } from "../types.ts";

type TemplateProps = {
  factory: {
    name: string;
  };
  fetcherParmas: string;
  hookParmas: string;
  /**
   * Name of the function
   */
  name: string;
  /**
   * Generics that needs to be added for TypeScript
   */
  generics?: string;
  /**
   * ReturnType(see async for adding Promise type)
   */
  returnType?: string;
  /**
   * Options for JSdocs
   */
  JSDoc?: {
    comments: string[];
  };
  hook: {
    name: string;
    generics?: string;
  };
  client: {
    method: HttpMethod;
    generics: string;
    withQueryParams: boolean;
    withPathParams: boolean;
    withData: boolean;
    withHeaders: boolean;
    path: URLPath;
  };
  dataReturnType: NonNullable<PluginSwr["options"]["dataReturnType"]>;
};

function Template({
  factory,
  hookParmas,
  fetcherParmas,
  name,
  generics,
  returnType,
  JSDoc,
  client,
  hook,
  dataReturnType,
}: TemplateProps): ReactNode {
  const clientOptions = [
    `method: "${client.method}"`,
    "url",
    client.withQueryParams ? "params" : undefined,
    client.withData ? "data" : undefined,
    client.withHeaders
      ? "headers: { ...headers, ...clientOptions.headers }"
      : undefined,
    "...clientOptions",
  ].filter(Boolean);

  const resolvedClientOptions = `${transformers.createIndent(
    4
  )}${clientOptions.join(`,\n${transformers.createIndent(4)}`)}`;

  // create fetch function
  const fetcherFunctionName =
    factory.name.charAt(0).toLowerCase() + factory.name.slice(1) + "Fetcher";
  const fetcherUrlName = fetcherFunctionName + "Url";

  const fetcherElement = (
    <>
      <Text>
        export const {fetcherUrlName} = "{client.path.path}";
      </Text>
      <Function export async name={fetcherFunctionName} params={fetcherParmas}>
        {`
    const url = ${client.path.template} as const
    return client<${client.generics}>({
      ${resolvedClientOptions}
    })
  `}
      </Function>
    </>
  );

  if (client.withQueryParams) {
    return (
      <>
        {fetcherElement}
        <Function
          export
          name={name}
          generics={generics}
          returnType={returnType}
          params={hookParmas}
          JSDoc={JSDoc}
        >
          {`
         const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {}

         const url = ${client.path.template} as const
         return ${hook.name}<${hook.generics}>(
          shouldFetch ? [url, params]: null,
          async (_url${client.withData ? ", { arg: data }" : ""}) => {
            const res = await client<${client.generics}>({
              ${resolvedClientOptions}
            })

            return ${dataReturnType === "data" ? "res.data" : "res"}
          },
          mutationOptions
        )
      `}
        </Function>
      </>
    );
  }
  return (
    <>
      {fetcherElement}
      <Function
        export
        name={name}
        generics={generics}
        returnType={returnType}
        params={hookParmas}
        JSDoc={JSDoc}
      >
        {`
       const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {}

       const url = ${client.path.template} as const
       return ${hook.name}<${hook.generics}>(
        shouldFetch ? url : null,
        async (_url${client.withData ? ", { arg: data }" : ""}) => {
          const res = await client<${client.generics}>({
            ${resolvedClientOptions}
          })

          return ${dataReturnType === "data" ? "res.data" : "res"}
        },
        mutationOptions
      )
    `}
      </Function>
    </>
  );
}

const defaultTemplates = {
  default: Template,
} as const;

type Props = {
  factory: {
    name: string;
  };
  /**
   * This will make it possible to override the default behaviour.
   */
  Template?: React.ComponentType<TemplateProps>;
};

export function Mutation({
  factory,
  Template = defaultTemplates.default,
}: Props): ReactNode {
  const {
    plugin: {
      options: { dataReturnType },
    },
  } = useApp<PluginSwr>();
  const { getSchemas, getName } = useOperationManager();
  const operation = useOperation();

  const name = getName(operation, { type: "function" });
  const schemas = getSchemas(operation);

  const client = {
    method: operation.method,
    path: new URLPath(operation.path),
    generics: [
      `${factory.name}["data"]`,
      `${factory.name}["error"]`,
      schemas.request?.name ? `${factory.name}["request"]` : "",
    ]
      .filter(Boolean)
      .join(", "),
    withQueryParams: !!schemas.queryParams?.name,
    withData: !!schemas.request?.name,
    withPathParams: !!schemas.pathParams?.name,
    withHeaders: !!schemas.headerParams?.name,
  };

  const resultGenerics = [
    `${factory.name}["response"]`,
    `${factory.name}["error"]`,
  ];

  const commonParams: FunctionParamsAST[] = [
    ...getASTParams(schemas.pathParams, { typed: true }),
    {
      name: "params",
      type: `${factory.name}['queryParams']`,
      enabled: client.withQueryParams,
      required: false,
    },
    {
      name: "headers",
      type: `${factory.name}['headerParams']`,
      enabled: client.withHeaders,
      required: false,
    },
  ];

  const fetcherParams = new FunctionParams();
  fetcherParams.add([
    ...commonParams,
    {
      name: "data",
      type: `${factory.name}["request"]`,
      enabled: client.withData,
      required: true,
    },
    {
      name: "clientOptions",
      type: `${factory.name}['client']['parameters']`,
      enabled: true,
      required: false,
    },
  ]);

  const hookParams = new FunctionParams();
  hookParams.add([
    ...commonParams,
    {
      name: "options",
      required: false,
      type: `{
      mutation?: SWRMutationConfiguration<${resultGenerics.join(", ")}>,
      client?: ${factory.name}['client']['parameters'],
      shouldFetch?: boolean,
    }`,
      default: "{}",
    },
  ]);

  const hook = {
    name: "useSWRMutation",
    generics: [
      ...resultGenerics,
      client.withQueryParams
        ? "[typeof url, typeof params] | null"
        : "typeof url | null",
      client.withData && `${factory.name}["request"]`,
    ]
      .filter(Boolean)
      .join(", "),
  };

  return (
    <Template
      factory={factory}
      name={name}
      JSDoc={{ comments: getComments(operation) }}
      client={client}
      hook={hook}
      hookParmas={hookParams.toString()}
      fetcherParmas={fetcherParams.toString()}
      dataReturnType={dataReturnType}
    />
  );
}

type FileProps = {
  /**
   * This will make it possible to override the default behaviour.
   */
  templates?: typeof defaultTemplates;
};

Mutation.File = function ({
  templates = defaultTemplates,
}: FileProps): ReactNode {
  const {
    plugin: {
      options: {
        client: { importPath },
      },
    },
  } = useApp<PluginSwr>();

  const { getSchemas, getFile, getName } = useOperationManager();
  const operation = useOperation();

  const schemas = getSchemas(operation);
  const file = getFile(operation);
  const fileType = getFile(operation, { pluginKey: [pluginTsName] });
  const factoryName = getName(operation, { type: "type" });

  const Template = templates.default;
  const factory = {
    name: factoryName,
  };

  return (
    <Parser language="typescript">
      <File<FileMeta>
        baseName={file.baseName}
        path={file.path}
        meta={file.meta}
      >
        <File.Import name="useSWRMutation" path="swr/mutation" />
        <File.Import
          name={["SWRMutationConfiguration", "SWRMutationResponse"]}
          path="swr/mutation"
          isTypeOnly
        />
        <File.Import name={"client"} path={importPath} />
        <File.Import name={["ResponseConfig"]} path={importPath} isTypeOnly />
        <File.Import
          name={[
            schemas.request?.name,
            schemas.response.name,
            schemas.pathParams?.name,
            schemas.queryParams?.name,
            schemas.headerParams?.name,
            ...(schemas.errors?.map((error) => error.name) || []),
          ].filter(Boolean)}
          root={file.path}
          path={fileType.path}
          isTypeOnly
        />

        <File.Source>
          <SchemaType factory={factory} />
          <Mutation Template={Template} factory={factory} />
        </File.Source>
      </File>
    </Parser>
  );
};

Mutation.templates = defaultTemplates;
