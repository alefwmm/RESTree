# RESTree
## An easy way to build an interface for your RESTful JSON API

RESTree was built with the intent of not recreating XMLHttpRequest’s objects
over and over again on your web application. You configure your RESTree only
once and use it everywhere.

Time to code!

## Adding your API root domain

On your HTML:

```html
<script src=”path/to/RESTree.js” type=”text/javascript>
<script src=”path/to/myapi.js” type=”text/javascript”>
```
**myapi.js**
```javascript
var myapi = function () {
    var config = RESTree(“http://domain/api/root”);
}();
```

Easy right?
