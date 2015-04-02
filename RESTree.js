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

var RESTree = function () {

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

        this.extractParams();
    };

    /**
     * Regular expression used to extract parameters from urls (http://domain/:version => version).
     */
    Node.prototype.paramRegex = /:([a-zA-Z][a-zA-Z0-9_]*):/g;

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
     * Extracts the parameters from the location.
     */
    Node.prototype.extractParams = function () {
        var match;

        while(match = this.paramRegex.exec(this.location))
            this.params.push(match[1]);
    }

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
    }

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
    }

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
    }

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
    }

    /**
     * Executes a request using a XmlHttpRequest.
     */
    ExecNode.prototype.request = function (method, urlParams) {
        var pipeline, xhr, url;

        url = this.mount(urlParams);
        xhr = new XMLHttpRequest();

        xhr.addEventListener("load", function (e) {
            console.log(this);
            console.log(e);
        });

        xhr.addEventListener("error", function (e) {
            console.log(this);
            console.log(e);
        });

        xhr.open(method, url);
        xhr.send();
    }

    /**
     * Executes GET request
     */
    ExecNode.prototype.get = function (urlParams) {
        return this.mount(urlParams);
    }


    /*================ ANONYMOUS SELF EXECUTING FUNCTION BODY */
    return RESTree;
}();

