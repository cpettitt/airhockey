function Input(renderer, start) {
    this._renderer = renderer;
    this.x = start.x;
    this.y = start.y;
    this.teleport = false;

    var self = this;
    function handleMouseMove(ev) {
        handleMove(ev);
    }

    function handleTouchStart(ev) {
        // We just use the first touch
        var touch = ev.touches[0];
        this.teleport = true;
        handleMove(touch);
    }

    function handleTouchMove(ev) {
        // We just use the first touch
        var touch = ev.touches[0];
        handleMove(touch);
    }

    function handleMove(ev) {
        var bbox = self._renderer.canvas.getBoundingClientRect();
        self.x = ev.pageX - bbox.left;
        self.y = ev.pageY - bbox.top;
    }

    document.body.addEventListener("mousemove", handleMouseMove.bind(this));
    document.body.addEventListener("touchstart", handleTouchStart.bind(this));
    document.body.addEventListener("touchmove", handleTouchMove.bind(this));
}

Input.prototype.resetTeleport = function() {
    this.teleport = false;
};

module.exports = Input;
