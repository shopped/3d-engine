var CIRCLE = Math.PI * 2;
var MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)

function Bitmap(src, width, height) {
	this.image = new Image();
	this.image.src = src;
	this.width = width;
	this.height = height;
}

function Player(x, y, direction) {
	this.x = x;
	this.y = y;
	this.magnitude = 0;
	this.angular_momentum = 0;
	this.direction = direction;
}
Player.prototype.move = function(forwards) {
	if (forwards === true) {
		if (this.magnitude < .3) //.3 is max speed
			this.magnitude += .1; //.1 is acceleration
	} else {						// you can notice that max speed is 3x acceleration which is 3x friction
		if (this.magnitude > -.3)
			this.magnitude -= .1;
	}

}
Player.prototype.inertia = function() {
	var magX = Math.cos(this.direction);
	var magY = Math.sin(this.direction);
	this.x = this.x + this.magnitude * magX;
	this.y = this.y + this.magnitude * magY;
	//console.log(this.magnitude); //save this for debugging friction
	if (this.magnitude > 0){ // positive friction
		this.magnitude -= .03;
	}
	else if (this.magnitude < 0){ //negative friction
		this.magnitude += .03;
	}
	if (Math.abs(this.magnitude) < .03) //comes to an absolute stop if momentum is less than friction
		this.magnitude = 0;
}

var MAX_ANGULAR_VELOCITY = mav = .3;
var RATE_ANGULAR_ACCELERATION = raa = .1;
var RATE_ANGULAR_FRICTION = raf = .07;

Player.prototype.rotate = function(dirangle) {
	if (dirangle === true) { //postive rotation
		if (this.angular_momentum < MAX_ANGULAR_VELOCITY)
		this.angular_momentum += raa;

	} else { //negative rotation
		if (this.angular_momentum > -1*MAX_ANGULAR_VELOCITY)
		this.angular_momentum -= raa;
	}
}

Player.prototype.angular_inertia = function() {
	this.direction = (this.direction + this.angular_momentum + CIRCLE) % CIRCLE;
	if (this.angular_momentum > 0) //positive friction
		this.angular_momentum -= RATE_ANGULAR_FRICTION;
	else if (this.angular_momentum < 0) //negative friction
		this.angular_momentum += RATE_ANGULAR_FRICTION;

	if (Math.abs(this.angular_momentum) < raf)
		this.angular_momentum = 0;
}

function Map(size) {
	this.size = size;
	this.wallGrid = new Uint8Array(size * size);
	this.wallTexture = new Bitmap('assets/wall_texture.jpg', 1024, 1024);
	this.light = 0;
}
Map.prototype.get = function(x, y) {
	x = Math.floor(x);
	y = Math.floor(y);
	if (x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1) return -1;
	return this.wallGrid[y * this.size + x];
};
Map.prototype.randomize = function() {
	for (var i = 0; i < this.size * this.size; i++) {
		this.wallGrid[i] = Math.random() < 0.3 ? 1 : 0;
	}
};
Map.prototype.cast = function(point, angle, range) {
	var self = this;
	var sin = Math.sin(angle);
	var cos = Math.cos(angle);
	var noWall = { length2: Infinity };
	return ray({ x: point.x, y: point.y, height: 0, distance: 0});
	function ray(origin) {
		var stepX = step(sin, cos, origin.x, origin.y);
		var stepY = step(cos, sin, origin.y, origin.x, true);
		var nextStep = stepX.length2 < stepY.length2
		? inspect(stepX, 1, 0, origin.distance, stepX.y)
		: inspect(stepY, 0, 1, origin.distance, stepY.x);

		if (nextStep.distance > range) return [origin];
		return [origin].concat(ray(nextStep));
	}
	function step(rise, run, x, y, inverted) {
		if (run == 0) return noWall;
		var dx = run > 0 ? Math.floor(x + 1) - x : Math.ceil(x - 1) - x;
		var dy = dx * (rise / run);
		return {
			x: inverted ? y + dy : x + dx,
			y: inverted ? x + dx : y + dy,
			length2: dx * dx + dy * dy
		};
	}
	function inspect(step, shiftX, shiftY, distance, offset) {
		var dx = cos < 0 ? shiftX : 0;
		var dy = sin < 0 ? shiftY : 0;
		step.height = self.get(step.x - dx, step.y - dy);
		step.distance = distance + Math.sqrt(step.length2);
		if (shiftX) step.shading = cos < 0 ? 2 : 0;
		else step.shading = sin < 0 ? 2 : 1;
		step.offset = offset - Math.floor(offset);
		return step;
	}
};
Map.prototype.update = function(seconds) {
	if (this.light > 0) this.light = Math.max(this.light - 10 * seconds, 0);
	else if (Math.random() * 5 < seconds) this.light = 2;
};

function Camera(canvas, resolution, focalLength) {
	this.ctx = canvas.getContext('2d');
	this.width = canvas.width = window.innerWidth * 0.5;
	this.height = canvas.height = window.innerHeight * 0.5;
	this.resolution = resolution;
	this.spacing = this.width / resolution;
	this.focalLength = focalLength || 0.8;
	this.range = MOBILE ? 8 : 14;
	this.lightRange = 5;
	this.scale = (this.width + this.height) / 1200;
}
Camera.prototype.render = function(player, map) {
	//this.drawSky(player.direction, map.skybox, map.light);
	this.drawColumns(player, map);
	if(minimap==true){
		this.drawMinimap(map);
	}
	//this.drawWeapon(player.weapon, player.paces);
};
Camera.prototype.drawMinimap = function(map) {
	var ctx = this.ctx;
	var mapscale = 1;
	var ms = mapscale;
	ctx.save();
	ctx.beginPath();
	for (var i = 0; i < map.wallGrid.length; i++) {
		var x = (i % map.size);
		var y = Math.floor(i / map.size);
		x += 1;
		y += 1;
		if (map.wallGrid[i] == 1) {
			ctx.fillStyle = '#000000';
		} else {
			ctx.fillStyle = '#ffffff';
		}
		ctx.fillRect(x * ms, y*ms, ms, ms)
	}
	ctx.fillStyle = '#00ff00';
	/**if (player.direction <= Math.PI / 4 || player.direction >= (7/4)*Math.PI) {
		ctx.fillRect(ms*33, ms, ms, ms*32);
	} else if (player.direction <= (3/4)*Math.PI) {
		ctx.fillRect(ms, ms*33, ms*32, ms);
	} else if (player.direction <= 3*Math.PI/2) {
		ctx.fillRect(0, ms, ms, ms*32);
	} else {
		ctx.fillRect(ms, 0, ms*32, ms);
	}**/
	ctx.fillStyle = '#ff0000';
	ctx.fillRect(player.x*ms, player.y*ms, ms, ms);
	this.ctx.restore();
}
Camera.prototype.drawColumns = function(player, map) {
	this.ctx.save();
	this.ctx.fillRect(0, 0, 1000, 1000);
	for (var column = 0; column < this.resolution; column++) {
		var x = column / this.resolution - 0.5;
		var angle = Math.atan2(x, this.focalLength);
		var ray = map.cast(player, player.direction + angle, this.range);
		this.drawColumn(column, ray, angle, map);
	}
	this.ctx.restore();
};
Camera.prototype.drawColumn = function(column, ray, angle, map) {
	var ctx = this.ctx;
	var texture = map.wallTexture;
	var left = Math.floor(column * this.spacing);
	var width = Math.ceil(this.spacing);
	var hit = -1;
	while (++hit < ray.length && ray[hit].height <= 0);
	for (var s = ray.length - 1; s >= 0; s--) {
		var step = ray[s];
		if (s === hit) {
			var textureX = Math.floor(texture.width * step.offset);
			var wall = this.project(step.height, angle, step.distance);
			ctx.globalAlpha = 1;
			ctx.drawImage(texture.image, textureX, 0, 1, texture.height, left, wall.top, width, wall.height);

			ctx.fillStyle = '#000000';
			ctx.globalAlpha = Math.max((step.distance + step.shading) / this.lightRange - map.light, 0);
			ctx.fillText(left, wall.top, width, wall.height);
		}

		ctx.fillStyle = '#ffffff';
		ctx.globalAlpha = 0.15;
	}
};
Camera.prototype.project = function(height, angle, distance) {
	var z = distance * Math.cos(angle);
	var wallHeight = this.height * height / z;
	var bottom = this.height / 2 * (1 + 1 / z);
	return {
		top: bottom - wallHeight,
		height: wallHeight
	};
};

function GameLoop() {
	this.frame = this.frame.bind(this); // calling frame will call loop.frame
	this.lastTime = 0;
	this.callback = function () {};
}
GameLoop.prototype.start = function(callback) {
	this.callback = callback; // will run the callback function after completion
	requestAnimationFrame(this.frame); // what is this?
};
GameLoop.prototype.frame = function(time) {
	var seconds = (time - this.lastTime) / 1000;
	this.lastTime = time;
	if (seconds < 0.2) this.callback(seconds);
	requestAnimationFrame(this.frame);
	player.inertia();
	player.angular_inertia();
};


var display = document.getElementById('display');
var player = new Player(16, 16, 0);
var map = new Map(64);
var camera = new Camera(display, MOBILE ? 160 : 640, 0.8);
var loop = new GameLoop();
var minimap = true;
map.randomize();

loop.start(function frame(seconds) {
	map.update(seconds);
	camera.render(player, map);
});

Mousetrap.bind('a', function () {
	player.rotate(false);
});
Mousetrap.bind('d', function () {
	player.rotate(true);
});
Mousetrap.bind('w', function() {
	player.move(true);
});
Mousetrap.bind('s', function() {
	player.move(false);
});
Mousetrap.bind('m', function () {
	minimap = !minimap;
	console.log(minimap);
});

Mousetrap.bind('left', function () {
	player.rotate(false);
});

Mousetrap.bind('right', function () {
	player.rotate(true);
});
Mousetrap.bind('up', function() {
	player.move(true);
});
Mousetrap.bind('down', function() {
	player.move(false);
});