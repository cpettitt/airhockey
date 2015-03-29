var PIXI = require("pixi.js");

function Renderer(width, height, tableFrame, tableTopFrame) {
    this._renderer = PIXI.autoDetectRenderer(width, height);
    this._renderer.transparent = true;
    this._stage = new PIXI.Stage(0x333333);
    this._renderCache = {};

    this._entityContainer = new PIXI.DisplayObjectContainer();

    var scoreStyle = {
        font: "bold 30pt Helvetica",
        fill: "#999999",
        align: "center"
    };

    this._meScore = new PIXI.Text("", scoreStyle);
    this._meScore.position = { x: 250, y: 280 };
    this._meScore.anchor = { x: 0.5, y: 0.5 };

    this._otherScore = new PIXI.Text("", scoreStyle);
    this._otherScore.position = { x: 250, y: 220 };
    this._otherScore.anchor = { x: 0.5, y: 0.5 };

    this._stage.addChild(PIXI.Sprite.fromFrame(tableFrame));
    this._stage.addChild(this._meScore);
    this._stage.addChild(this._otherScore);
    this._stage.addChild(this._entityContainer);
    this._stage.addChild(PIXI.Sprite.fromFrame(tableTopFrame));

    this.canvas = this._renderer.view;
}

Renderer.prototype.makeFullScreen = function() {
    window.scrollTo(0, 1);
};

Renderer.prototype.render = function(entities) {
    Object.keys(entities).forEach(function(entityId) {
        var entity = entities[entityId];
        if (entity.spriteUrl && entity.position) {
            var sprite = this._renderCache[entityId];
            if (!sprite) {
                sprite = this._renderCache[entityId] = PIXI.Sprite.fromFrame(entity.spriteUrl);
                sprite.anchor = { x: 0.5, y: 0.5 };
                this._entityContainer.addChild(sprite);
            }

            sprite.position = entity.position;
        }

    }, this);

    // Render each player's score
    this._meScore.setText(entities.me.score);
    this._otherScore.setText(entities.other.score);

    this._renderer.render(this._stage);
};

module.exports = Renderer;
