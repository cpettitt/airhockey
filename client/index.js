"use strict";

var PIXI = require("pixi.js");
var Stats = require("stats-js");
var Renderer = require("./Renderer");
var Input = require("./Input");
var Physics = require("./Physics");
var V2 = require("v2");

var STATS_RE = /[?&]stats=true/;
var stats;
if (window.location.search.match(STATS_RE)) {
    stats = new Stats();
    document.body.appendChild(stats.domElement);
} else {
    stats = {};
    stats.begin = stats.end = function() {};
}

var assets = [
    "img/table.png",
    "img/table-top.png",
    "img/green-mallet.png",
    "img/red-mallet.png",
    "img/puck.png"
];
// TODO fancier loader with visual indicators
var loader = new PIXI.AssetLoader(assets);
loader.on("onComplete", function() {
    console.log("Asset load complete");
    requestAnimationFrame(gameLoop);
});
loader.load();

var width = 300;
var height = 500;
var tablePadding = new V2(10, 10);
var tableOrigin = tablePadding;
var tableSize = new V2(width, height).subtract(tablePadding.scale(2));
var renderer = new Renderer(width, height, "img/table.png", "img/table-top.png");
document.getElementById("game").appendChild(renderer.canvas);

var entities = {};
var nextId = 0;

entities.puck = createPuck();
entities.me = createMallet(new V2(150, 450), "green");
entities.other = createMallet(new V2(150, 50), "red");

// Add walls to the table
entities[nextId++] = createWall(new V2(80, 0), new V2(80, 10));
entities[nextId++] = createWall(new V2(80, 10), new V2(10, 10));
entities[nextId++] = createWall(new V2(10, 10), new V2(10, 490));
entities[nextId++] = createWall(new V2(10, 490), new V2(80, 490));
entities[nextId++] = createWall(new V2(80, 490), new V2(80, 500));
entities[nextId++] = createWall(new V2(220, 500), new V2(220, 490));
entities[nextId++] = createWall(new V2(220, 490), new V2(290, 490));
entities[nextId++] = createWall(new V2(290, 490), new V2(290, 10));
entities[nextId++] = createWall(new V2(290, 10), new V2(220, 10));
entities[nextId++] = createWall(new V2(220, 10), new V2(220, 0));

// Add our goals
entities.myGoal = createWall(new V2(0, 490 + 3 * entities.puck.radius),
                             new V2(300, 490 + 3 * entities.puck.radius),
                             false);
entities.otherGoal = createWall(new V2(300, 0 - 3 * entities.puck.radius),
                                new V2(0, 0 - 3 * entities.puck.radius),
                                false);

function createMallet(position, color) {
    return {
        spriteUrl: "img/" + color + "-mallet.png",
        shape: "circle",
        radius: 25,
        position: position,
        velocity: new V2(0, 0),
        score: 0,
        solid: true
    };
}

function createPuck() {
    return {
        spriteUrl: "img/puck.png",
        shape: "circle",
        radius: 13,
        restitution: 0.8,
        position: new V2(0, 0),
        velocity: new V2(0, 0),
        solid: true
    };
}

// Order is important. The face of the wall will be point to the right of the
// line segment ab.
function createWall(a, b, solid) {
    if (solid === undefined) {
        solid = true;
    }

    return {
        shape: "segment",
        p0: a,
        p1: b,
        solid: solid
    };
}

var input = new Input(renderer, entities.me.position);
function processInput(entities, dt) {
    if (dt) {
        var me = entities.me;
        var x = Math.max(tableOrigin.x + me.radius,
                         Math.min(input.x, tableOrigin.x + tableSize.x - me.radius));
        var y = Math.max(Math.ceil(tableOrigin.y + tableSize.y / 2) + me.radius,
                         Math.min(input.y, tableOrigin.y + tableSize.y - me.radius));
        if (input.teleport) {
            me.position = new V2(x, y);
            input.resetTeleport();
        } else {
            me.velocity = new V2(x, y).subtract(me.position).scale(1 / dt);
        }
    }
}

var physics = new Physics(tableOrigin, tableSize);
function runPhysics(entities, dt) {
    physics.tick(entities, dt);
}

var lastTime;
function gameLoop() {
    stats.begin();

    lastTime = lastTime || Date.now();
    var currTime = Date.now();
    var dt = (currTime - lastTime) / 1000;

    processInput(entities, dt);
    runPhysics(entities, dt);
    renderer.render(entities);

    if (entities.myGoal.collision) {
        entities.other.score++;
        nextRound(true);
    }

    if (entities.otherGoal.collision) {
        entities.me.score++;
        nextRound(false);
    }

    lastTime = currTime;

    stats.end();
    requestAnimationFrame(gameLoop);
}

function nextRound(meServe) {
    entities.puck.velocity = new V2(0, 0);
    if (meServe) {
        entities.puck.position = findNonOverlappingPosition(375, entities.me);
    } else {
        entities.puck.position = findNonOverlappingPosition(125, entities.other);
    }
}

function findNonOverlappingPosition(y, entity) {
    // For now we just see which half of the court the entity is on and we
    // use the other side.
    if (entity.position.x < 150) {
        return new V2(225, y);
    } else {
        return new V2(75, y);
    }
}

// Start the game
nextRound(true);
