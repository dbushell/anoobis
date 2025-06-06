/** Additional server request information  */
export type Info = Deno.ServeHandlerInfo<Deno.NetAddr>;

/** Anoobis configuration */
export type Config = {
  difficulty: number;
  hostname: string;
  port: number;
  reverse_proxy: {
    [key: string]: {
      protocol: string;
      hostname: string;
      port: number;
    };
  };
};
