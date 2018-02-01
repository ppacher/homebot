import {Injectable, Logger} from '@homebot/core';

import * as restify from 'restify';

/** A set of allowed HTTP verbs */
export type HTTPVerb = 'get' | 'post' | 'put' | 'delete' | 'head' | 'trace' | 'patch';

/** The definition of a request handler function  */
export interface HTTPHandler {
    (req: restify.Request, res: restify.Response): void;
}

export interface RemoveRouteFn {
    (): void;
};

/**
 * HTTPServer provides a simple HTTP server interface to be used by Homebot modules
 * 
 * It basically wraps the `restify` package.
 * 
 */
@Injectable()
export class HTTPServer {
    private _server: restify.Server|undefined = undefined;
    
    constructor(private readonly log: Logger) {
        this._server = restify.createServer();
        
        this._server.use(restify.plugins.bodyParser({mapParams: false}));
    } 
    
    /** Listen starts listening on incoming requests */
    listen(where: number|string): void {
        if (this._server.listening) {
            throw new Error(`HTTPServer already listening`);
        }
        
        this._server.listen(where);
        this.log.info(`[http] listening on ${where}`);
    }
    
    /** Registers a new listener for the given HTTP verb and URL */
    register(verb: HTTPVerb, route: RegExp|string|restify.RouteOptions, handler: HTTPHandler): RemoveRouteFn {
        let m = this._server[verb];

        if (m === undefined) {
            throw new Error(`Unsupported HTTP verb: ${verb}`);
        }
        
        let result: restify.Route = m.apply(this._server, [route, handler]);

        return () => {
            // BUG(ppacher): according to typings it should be a string, according to docs we pass in the "blob" result of a mount call
            // We CAN pass in the whole route
            // TODO(ppacher): check if it removes all verb handlers, if so -> BUG
            this._server.rm(result as any);
        }
    }
}
