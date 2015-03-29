var express = require("express"),
    http = require("http"),
    app = express(),
    httpServer = http.createServer(app);

if (process.env.NODE_ENV === "development") {
    // Inject a script tag to load livereload. This does not actually serve live
    // reload, though!
    app.use(require("connect-livereload")({ port: 35729 }));
}

app.use(express.static("build"));

httpServer.listen(8000, function() {
    console.log("Server listening at http://%s:%s",
                httpServer.address().address,
                httpServer.address().port);
});

process.on("exit", function() {
    console.log("Shutting down server", process.pid);
    app.close();
});
