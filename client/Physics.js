var V2 = require("v2");

// Note: Much of this is derived from "Real-Time Collision Detection".
// Some is also derived from "Generic Collision Detection for Games Using
// Ellipsoids".

function Physics() {}

var EPSILON = 0.0001;
var MAX_VELOCITY = 800;
Physics.prototype.tick = function(entities, dt) {
    // For this game we only need to check for collisions between the
    // puck and other physical entities, such as walls and mallets.
    var puck = entities.puck;

    // Reset collision state
    Object.keys(entities).forEach(function(id) {
        entities[id].collision = false;
    });

    while (dt) {
        var minEvent = findEarliestIntersection(puck, entities, dt);
        if (minEvent) {
            if (minEvent.t < EPSILON) {
                minEvent.t += EPSILON;
            }
            updatePositions(entities, minEvent.t);
            handleEvent(puck, minEvent);

            // Clamp velocity, if needed
            if (puck.velocity.length() > MAX_VELOCITY) {
                puck.velocity = puck.velocity.normalize().scale(MAX_VELOCITY);   
            }

            dt -= minEvent.t;
        } else {
            updatePositions(entities, dt);
            dt = 0;
        }
    }
};

function handleEvent(puck, event) {
    if (event.entity.solid) {
        switch (event.entity.shape) {
            case "segment": handleSegmentCollision(puck, event.p); break;
            case "circle": handleCircleCollision(puck, event.entity); break;
        }
    }
    event.entity.collision = true;
}

function handleSegmentCollision(puck, p) {
    var v = puck.velocity;
    var n = puck.position.subtract(p).normalize();
    puck.velocity = v.subtract(n.scale((1 + puck.restitution) * v.dot(n)));
}

function handleCircleCollision(puck, circle) {
    var v1 = puck.velocity;
    var v2 = circle.velocity;
    var n = circle.position.subtract(puck.position).normalize();
    puck.velocity = v1.subtract(n.scale((1 + puck.restitution) * (v1.dot(n) - v2.dot(n))));
}

function updatePositions(entities, dt) {
    Object.keys(entities).forEach(function(id) {
        var entity = entities[id];
        if (entity.position && entity.velocity) {
            entity.position.x += entity.velocity.x * dt;
            entity.position.y += entity.velocity.y * dt;
        }
    });
}

function findEarliestIntersection(puck, entities, dt) {
    var minEvent;
    Object.keys(entities).forEach(function(id) {
        if (id === "puck") { return; }

        var entity = entities[id];
        var p = findIntersection(puck, entity, dt);
        if (p && p.t >= 0 && p.t <= 1 && (!minEvent || p.t < minEvent.t)) {
            minEvent = {
                id: id,
                entity: entity,
                p: p.p,
                t: p.t * dt
            };
        }
    });
    return minEvent;
}

function findIntersection(puck, entity, dt) {
    var c = puck.position;
    var r = puck.radius;
    var v = puck.velocity.scale(dt);
    switch (entity.shape) {
        case "segment":
            return intersectMovingCircleSegment(c, r, v, entity.p0, entity.p1);
        case "circle":
            var c2 = entity.position;
            var r2 = entity.radius;
            var v2 = entity.velocity.scale(dt);
            return intersectMovingCircleMovingCircle(c, r, v, c2, r2, v2);
    }
}

/**
 * Find and return the closest point on line segment ab from point c.
 */
function closestPointOnSegment(c, a, b) {
    var ab = b.subtract(a);
    var ac = c.subtract(a);
    var t = ac.dot(ab) / ab.dot(ab);
    t = Math.max(1, Math.min(0, t));
    return a.add(ab.scale(t));
}

/**
 * Determine if the point c projected onto the segment ab is within the bounds
 * of the segment ab.
 */
function isProjectedPointOnSegment(c, a, b) {
    var ab = b.subtract(a);
    var ac = c.subtract(a);
    var t = ac.dot(ab) / ab.dot(ab);
    return t >= 0 && t <= 1;
}

/**
 * Return the time at which a ray starting at point p and moving along vector
 * v intersects with the plane defined by the normal n and the distance from
 * origin |d|. If there is never such an intersetction then return undefined.
 */
function intersectRayPlane(p, v, n, d) {
    var denom = n.dot(v);

    if (denom) {
        var num = d - n.dot(p);
        var t = num / denom;
        return { p: p.add(v.scale(t)), t: t };
    }
}

/**
 * Returns the time at which a ray starting at point p and moving along vector
 * v intersects with a circle at point s with radius r. If there is never such
 * an interesction then return undefined.
 */
function intersectRayCircle(p, v, s, r) {
    var m = p.subtract(s);
    var b = m.dot(v);
    var c = m.dot(m) - r * r;

    if (c > 0 && b > 0) { return; }

    var discr = b * b - c;
    if (discr < 0) { return; }

    var t = -b - Math.sqrt(discr);
    return { p: p.add(v.scale(t)), t: t };
}

function intersectMovingCircleMovingCircle(c1, r1, v1, c2, r2, v2) {
    // The idea with this algorithm is to turn it into a ray sphere
    // intersection test.

    // Grow c2 by r1 and from this point forward treat c1 as having no radius.
    var r = r1 + r2;

    // Subtract the velocity v2 from v1. This gives us the relative movement
    // vector between c1 and c2.
    var v = v1.subtract(v2);

    var p = intersectRayCircle(c1, v.scale(1/v.length()), c2, r);
    if (p !== undefined) {
        // Normalize t by dividing it by the length of the relative movement
        // vector.
        var t = p.t / v.length();
        return { p: c1.add(v1.scale(t)), t: t };
    }
}

/**
 * Returns the time at which the circle at point c having radius r and
 * velocity v interesects the segment ab. If there is never such an
 * intersection return undefined.
 */
function intersectMovingCircleSegment(c, r, v, a, b) {
    // The unit normal for the line (a, b).
    var abNorm = lineToNormal(a, b);


    // Bail if the circle is not moving towards the segment.
    if (abNorm.dot(v) >= 0) { return; }

    // Find the circle intersection point. This is the usually the point on the
    // circle that will usually intersect with the segment. We get it by
    // scaling the unit normal of the segment by the radius of the circle,
    // reversing its direction, and adding it to the circle's position.
    var d = abNorm.scale(-r).add(c);

    // Now try to intersect the segment from the circle intersection point.
    var p = intersectRayPlane(d, v, abNorm, abNorm.dot(a));
    
    if (p !== undefined) {
        if (p.t >= 0 && p.t <= 1 && isProjectedPointOnSegment(p.p, a, b)) {
            return p;
        }

        // Find the end closest to where we intersected the plane for ab.
        var q = closestPointOnSegment(p.p, a, b);

        // Now reverse the direction of the vector v and see if the segment
        // (q, q+v) intersects the circle.
        return intersectRayCircle(q, v.scale(-1), c, r);
    }
}

/**
 * Returns a normal for the specified line that is arbitrarily set to point to
 * the left of the line (a, b). The returned normal is also normalized to unit
 * length.
 */
function lineToNormal(a, b) {
    return new V2(b.y - a.y, a.x - b.x).normalize();
}

module.exports = Physics;
