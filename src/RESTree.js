/**
 * RESTree
 *
 * author: alefwmm
 * description:
 *      The RESTree provides an easy to configure an interface
 *      to your existing API.
 * info: https://github.com/alefwmm/RESTree
 *
 * [R] stands for required
 * [O] stands for optional
 */

'use strict';
if (!window.RESTree) {
    window.RESTree = function () {

        /**
         * Creates an intance of Node. This instance is the root of the tree.
         *
         * domain : the initial domain of the API (http://domain/) [R]
         */
        function RESTree(domain) {
            return new Node(domain, null);
        };

        /**
         * Node constructor.
         *
         * location : an endpoint of the API (user, photos) [R]
         * parent   : the parent node, this will be used to compose urls later [O]
         */
        function Node(location, parent) {
            this.location = location;
            this.parent   = parent;
            this.nodes    = [];
            this.params   = [];
            this.headers  = {};

            this.pipes = {
                get: {
                    out: [],
                    in:  []
                },
                post: {
                    out: [],
                    in:  []
                },
                put: {
                    out: [],
                    in:  []
                },
                delete: {
                    out: [],
                    in:  []
                }
            };

            this.extractParams();
        };

        /**
         * Regular expression used to extract parameters from urls (http://domain/:version => version).
         */
        Node.prototype.paramRegex = /{([a-zA-Z][a-zA-Z0-9_]*)}/g;

        /**
         * Creates one Node and adds it as a child.
         *
         * name     : the endpoint name of the child node (user) [R]
         * location : the url for the given endpoint, if not set, name used (user/:id) [O]
         */
        Node.prototype.add = function (name, location) {
            if (this.hasOwnProperty(name))
                throw new Error("The given name '" + name + "' is already registered on node '" + this.location + "'");

            location   = location || name;
            this[name] = new Node(location, this);

            this.nodes.push(name);

            return this;
        };

        /**
         * Registers a given list of functions to the pipeline of execution.
         *
         * method : 'get', 'post', 'put', 'delete'
         * line   : 'in' for incoming data, 'out' for outcoming data, 'error' for error handling on outcoming responses
         * pipes  : list of functions to be used in order by the pipeline
         */
        Node.prototype.pipe = function (method, line, pipes) {
            if (!this.pipes.hasOwnProperty(method))
                throw new Error("The given method name '" + method + "' does not exist, use 'get', 'post', 'put' or 'delete'.");
            else if (!this.pipes[method].hasOwnProperty(line))
                throw new Error("The given line name '" + line + "' is not defined, use 'in', 'out' or 'error'");

            for (var i = 0, length = pipes.length, next = pipes[i]; i < length; i++, next = pipes[i])
                this.pipes[method][line].push(next);

        };

        /**
         * Some sugar to be used instead of 'pipe' method, line fixed to 'in'.
         *
         * method : See 'pipe' method
         * [...]  : functions to be used in the pipeline
         */
        Node.prototype.in = function (method) {
            var pipes = [];

            for (var i = 1, length = arguments.length; i < length; i++)
                pipes.push(arguments[i]);

            this.pipe(method, 'in', pipes);
        };

        /**
         * Some sugar to be used instead of 'pipe' method, line fixed to 'out'.
         *
         * method : See 'pipe' method
         * [...]  : functions to be used in the pipeline
         */
        Node.prototype.out = function (method) {
            var pipes = [];

            for (var i = 1, length = arguments.length; i < length; i++)
                pipes.push(arguments[i]);

            this.pipe(method, 'out', pipes);
        };

        /**
         * (HIDDEN) Loads the default node headers in the given 'xhr' element.
         *
         * node : the node containing the necessary headers
         * xhr  : the XMLHttpRequest object
         */
        function loadHeaders(node, xhr) {
            var keys, nodes;

            nodes = [];

            while (node) {
                nodes.unshift(node);
                node = node.parent;
            }

            while (node = nodes.shift()) {
                keys = Object.keys(node.headers);
                for (var i = 0, length = keys.length, key = keys[i]; i < length; i++, key = keys[i])
                    xhr.setRequestHeader(key, node.headers[key]);
            }
        };

        /**
         * Registers a given header.
         *
         * key   : Header name ('Content-type')
         * value : The value of the header ('application/json')
         */
        Node.prototype.header = function (key, value) {
            this.headers[key] = value;
        };

        /**
         * Extracts the parameters from the location.
         */
        Node.prototype.extractParams = function () {
            var match;

            while(match = this.paramRegex.exec(this.location))
                this.params.push(match[1]);
        };

        /**
         * Parses the local location given the data object, and returns it.
         *
         * data : an object carrying the values from the parameters ({id: 99}) [R]
         */
        Node.prototype.localLocation = function (data) {
            var location, param;

            location = this.location;

            for (
                var i      = 0,
                    length = this.params.length;
                i < length;
                i++
            ) {
                var param;

                param = this.params[i];

                if (!data.hasOwnProperty(param))
                    throw new Error("Missing property '" + param + "' on '" + this.location + "'.");

                location = location.replace(this.paramRegex, data[param]);
            }

            return location;
        };

        /**
         * Compiles the tree into an execution tree. This method should be called when the configuration of
         * the endpoints is done, and only on the root node. Returns the ExecNode of the root.
         */
        Node.prototype.compile = function () {
            var root, nodes;

            if (this.parent)
                throw new Error("You may only use compile method on the root of RESTree.");

            root = new ExecNode(this, null);
            nodes = [];

            // Registers the direct children of 'root' to be processed
            for (
                var i      = 0,
                    length = this.nodes.length;
                i < length;
                i++
            ) {
                var name;

                name = this.nodes[i];

                nodes.push([this[name], root, name]);
            }

            // While there are nodes to be processed, process them
            for (
                var remaining =  nodes.length;
                remaining;
                remaining--
            ) {
                var current, node, parent, name, exec;

                current = nodes.shift();
                node    = current[0];
                parent  = current[1];
                name    = current[2];

                exec         = new ExecNode(node, parent);
                parent[name] = exec;

                // Registers the direct children of 'node' to be processed
                for (
                    var i = 0,
                        length = node.nodes.length;
                    i < length;
                    i++
                ) {
                    var name;

                    name = node.nodes[i];

                    nodes.push([node[name], exec, name]);
                }

                // 'remaining' updated
                remaining += node.nodes.length;
            }

            return root.branch(null);
        };

        /**
         * ExecNode contructor
         *
         * node   : the Node to be used as configuration [R]
         * parent : the parent of the ExecNode [O]
         */
        function ExecNode(node, parent) {
            this.node = node;
            this.parent = parent;
        }

        /**
         * Creates a child object from the current ExecNode. This will be used to store the current
         * query arguments and the last query performed.
         *
         * last : the last executed query
         */
        ExecNode.prototype.branch = function (last) {
            var branch, caller, children;

            branch      = Object.create(this);
            branch.last = last;
            branch.args = null;

            if (this.node.params.length) {
                caller =
                    function (args) {
                        this.args = args;
                        return this;
                    }.bind(branch);
            } else
                caller = branch;

            children = branch.node.nodes;

            for (
                var i = 0,
                    length = children.length;
                i < length;
                i++
            ) {
                var name;

                name = children[i];

                Object.defineProperty(branch, name, {
                    get: lazyFetch(name),
                    enumerable: true
                });
            }

            return caller;
        };

        /**
         * (HIDDEN) Helper function. This will create a new branch everytime you access an ExecNode.
         *
         * name : name of the ExecNode used as prototype [R]
         */
        function lazyFetch(name) {
            return function () {
                return this.__proto__[name].branch(this);
            }
        }

        /**
         * Return the constructed url from the query and 'urlParams'.
         *
         * urlparams : url params ({q: 'search'} => ?q=search) [O]
         */
        ExecNode.prototype.mount = function (urlParams) {
            var url, current, keys, param;

            url = this.node.localLocation(this.args);

            for(current = this.last; current; current = current.last)
                url = current.node.localLocation(current.args) + "/" + url;

            if (urlParams) {
                keys = Object.keys(urlParams);

                param = keys.shift();
                url += "?" + param + "=" + encodeURIComponent(urlParams[param]);

                while (param = keys.shift())
                    url += "&" + param + "=" + encodeURIComponent(urlParams[param]);
            }

            return url;
        };

        /**
         * Executes a request using a XmlHttpRequest.
         *
         * method : 'get', 'post', 'put' or 'delete'
         * query  : object with key/value pairs, to mount url query
         * data   : object with key/value pairs to be sent as body
         * success: if the request is successful, this callback is called with data as first argument
         * fail   : if the request failed, this callback is called with error status as first argument, and data as second
         */
        ExecNode.prototype.request = function (method, query, data, success, fail) {
            var xhr, url, pipes;

            url   = this.mount(query);
            pipes = this.node.pipes[method].out;
            data  = JSON.stringify(executePipes(pipes, data));
            xhr   = new XMLHttpRequest();

            xhr.addEventListener("load", function (event) {
                handleResponse(this.node, event, method, success, fail);
            }.bind(this));

            xhr.open(method, url);

            xhr.setRequestHeader('Content-type', 'application/json');
            loadHeaders(this.node, xhr);

            xhr.send(data);
        };

        /**
         * (HIDDEN) Handles the response.
         *
         * arguments : take a look at request method
         */
        function handleResponse(node, event, method, success, fail) {
            var data, status, pipes;

            data = JSON.parse(event.target.responseText);
            status = event.target.status;

            if (status >= 200 && status < 300) {
                pipes = node.pipes[method].in;
                data = executePipes(pipes, data);
                if (success) success(status, data);
            } else {
                if (fail) fail(status, data);
            }
        }

        /**
         * (HIDDEN) Executes each transformation/pipeline function.  Returns the final result.
         *
         * pipes : the array of pipe functions
         * data  : the data to be applied the transformation
         */
        function executePipes(pipes, data) {
            if (!data) return undefined;

            for(var i = 0, length = pipes.length; i < length; i++) {
                data = pipes[i](data);
            }

            return data;
        }

        /*GET sugar for request method */
        ExecNode.prototype.get = function (properties) {
            return this.request('get', properties.query, properties.body, properties.success, properties.fail);
        };

        /*POST sugar for request method */
        ExecNode.prototype.post = function (urlParams, data, success, fail) {
            return this.request('post', properties.query, properties.body, properties.success, properties.fail);
        };

        /*PUT sugar for request method */
        ExecNode.prototype.put = function (urlParams, data, success, fail) {
            return this.request('put', properties.query, properties.body, properties.success, properties.fail);
        };

        /*DELETE sugar for request method */
        ExecNode.prototype.delete = function (urlParams, data, success, fail) {
            return this.request('delete', properties.query, properties.body, properties.success, properties.fail);
        };

        /*================ ANONYMOUS SELF EXECUTING FUNCTION BODY */
        return RESTree;
    }();
}
