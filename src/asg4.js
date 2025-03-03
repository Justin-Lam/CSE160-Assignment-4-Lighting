const VSHADER_SOURCE = `
	precision mediump float;

	attribute vec4 a_Position;
	varying vec3 v_Position;	// vertex position in vertex shader, fragment position in fragment shader
	uniform mat4 u_ModelMatrix;
	uniform mat4 u_ViewMatrix;
	uniform mat4 u_ProjectionMatrix;

	varying vec2 v_UV;
	attribute vec2 a_UV;

	varying vec3 v_Normal;		// vertex normal in vertex shader, fragment normal in fragment shader
	attribute vec4 a_Normal;
	uniform mat4 u_NormalMatrix;

	void main() {
		gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;	// in screen space
		v_UV = a_UV;
		v_Position = vec3(u_ModelMatrix * a_Position);									// in world space
		v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));
	}
`;

const FSHADER_SOURCE = `
	precision mediump float;

	uniform int u_Material;

	uniform vec4 u_Color;
	
	varying vec2 v_UV;
	uniform sampler2D u_Sampler0;
	uniform sampler2D u_Sampler1;

	uniform bool u_LightingEnabled;
	varying vec3 v_Position;		// vertex position in vertex shader, fragment position in fragment shader
	varying vec3 v_Normal;			// vertex normal in vertex shader, fragment normal in fragment shader
	uniform vec3 u_LightPosition;
	uniform vec3 u_CameraPosition;

	void renderMaterial();
	void applyLighting();

	void main() {
		renderMaterial();
		if (u_LightingEnabled) applyLighting();
	}

	void renderMaterial() {
		if (u_Material == -2)		gl_FragColor = vec4((v_Normal + 1.0)/2.0, 1.0);	// use normal for debugging
		else if (u_Material == -1) 	gl_FragColor = vec4(v_UV, 1, 1);				// use UV for debugging
		else if (u_Material == 0) 	gl_FragColor = u_Color;							// use color
		else if (u_Material == 1) 	gl_FragColor = texture2D(u_Sampler0, v_UV);		// use TEXTURE0
		else if (u_Material == 2) 	gl_FragColor = texture2D(u_Sampler1, v_UV);		// use TEXTURE1
		else 						gl_FragColor = vec4(1, 0.2, 0.2, 1);			// error, make red	
	}

	void applyLighting() {
		vec3 l = normalize(u_LightPosition - v_Position);
		vec3 n = normalize(v_Normal);
		float nDotL = max(0.0, dot(n, l));

		vec3 e = normalize(u_CameraPosition - v_Position);
		vec3 r = reflect(-l, n);	// l needs to be negative because of how the function works
		float c = 100.0;

		float s = 0.3;
		float a = 0.3;

		vec3 diffuse = vec3(gl_FragColor) * nDotL;
		float specular = pow(max(dot(e, r), 0.0), c) * s;
		vec3 ambient = vec3(gl_FragColor) * a;
		
		gl_FragColor = vec4(diffuse + specular + ambient, 1.0);
	}
`;

let canvas;
let gl;
let camera;

let showNormals = false;
let lightingEnabled = true;
let lightPos = [0, 8, -2];

let a_Position;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;

let a_Normal;
let u_NormalMatrix;

let a_UV;

let u_Material;

let u_Color;

let u_Sampler0;
let u_Sampler1;

let u_LightingEnabled;
let u_LightPosition;
let u_CameraPosition;

function main() {
	getGlobalVars();
	setupWebGL();
	initTextures();
	initUI();

	//document.onmousemove = (e) => onMouseMove(e);
	//document.onmousedown = (e) => onMouseDown(e);
	document.onkeydown = (e) => onKeydown(e);

	gl.clearColor(0,0,0,1);	// black

	initSky();
	initFloor();
	initWalls();
	initKing();
	initSphere();

	requestAnimationFrame(tick);
}

/** Gets this.canvas, this.gl, and this.camera. */
function getGlobalVars() {
	canvas = document.getElementById("webgl");

	gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
	if (!gl) throw new Error("Failed to get the rendering context for WebGL.");
	gl.enable(gl.DEPTH_TEST);

	camera = new Camera();
	const translation = new Vector3([0,1.5,8]);
	camera.eye.add(translation);
	camera.at.add(translation);
}

/** Compiles shaders and links GLSL ES variables. */
function setupWebGL() {
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) throw new Error("Failed to intialize shaders.");

	a_Position = gl.getAttribLocation(gl.program, "a_Position");
	if (a_Position < 0) throw new Error("Failed to get the storage location of a_Position.");

	a_Normal = gl.getAttribLocation(gl.program, "a_Normal");
	if (a_Normal < 0) throw new Error("Failed to get the storage location of a_Normal.");

	a_UV = gl.getAttribLocation(gl.program, "a_UV");
	if (a_UV < 0) throw new Error("Failed to get the storage location of a_UV.");

	u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
	if (!u_ModelMatrix) throw new Error("Failed to get the storage location of u_ModelMatrix.");
	gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);	// identity matrix

	u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
	if (!u_ViewMatrix) throw new Error("Failed to get the storage location of u_ViewMatrix.");

	u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
	if (!u_ProjectionMatrix) throw new Error("Failed to get the storage location of u_ProjectionMatrix.");

	u_LightPosition = gl.getUniformLocation(gl.program, "u_LightPosition");
	if (!u_LightPosition) throw new Error("Failed to get the storage location of u_LightPosition.");

	u_CameraPosition = gl.getUniformLocation(gl.program, "u_CameraPosition");
	if (!u_CameraPosition) throw new Error("Failed to get the storage location of u_CameraPosition.");

	u_Material = gl.getUniformLocation(gl.program, "u_Material");
	if (!u_Material) throw new Error("Failed to get the storage location of u_Material.");

	u_Color = gl.getUniformLocation(gl.program, "u_Color");
	if (!u_Color) throw new Error("Failed to get the storage location of u_Color.");

	u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
	if (!u_Sampler0) throw new Error("Failed to get the storage location of u_Sampler0.");

	u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");
	if (!u_Sampler1) throw new Error("Failed to get the storage location of u_Sampler1.");

	u_LightingEnabled = gl.getUniformLocation(gl.program, "u_LightingEnabled");
	if (!u_LightingEnabled) throw new Error("Failed to get the storage location of u_LightingEnabled.");

	u_NormalMatrix = gl.getUniformLocation(gl.program, "u_NormalMatrix");
	if (!u_NormalMatrix) throw new Error("Failed to get the storage location of u_NormalMatrix.");
}

function initTextures() {
	const image0 = new Image();
	if (!image0) throw new Error("Failed to create the image object.");
	image0.onload = () => sendToTexture0(image0);
	image0.src = "/assets/gigaGrass.jpg";

	const image1 = new Image();
	if (!image1) throw new Error("Failed to create the image object.");
	image1.onload = () => sendToTexture1(image1);
	image1.src = "/assets/stone.jpg";
}

function sendToTexture0(image) {
	const texture = gl.createTexture();
	if (!texture) throw new Error("Failed to create the texture object.");

	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);									// Flip the image's y axis
	gl.activeTexture(gl.TEXTURE0);												// Enable texture0
	gl.bindTexture(gl.TEXTURE_2D, texture);										// Bind the texture object to the target
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);			// Set the texture parameters
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);	// Set the texture image
	gl.uniform1i(u_Sampler0, 0);												// Set the texture0 to the sampler
}

function sendToTexture1(image) {
	const texture = gl.createTexture();
	if (!texture) throw new Error("Failed to create the texture object.");

	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);									// Flip the image's y axis
	gl.activeTexture(gl.TEXTURE1);												// Enable texture1
	gl.bindTexture(gl.TEXTURE_2D, texture);										// Bind the texture object to the target
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);			// Set the texture parameters
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);	// Set the texture image
	gl.uniform1i(u_Sampler1, 1);												// Set the texture1 to the sampler
}

function initUI() {
	document.getElementById("toggleNormalsButton").onclick = () => showNormals = !showNormals;
	document.getElementById("toggleLightingButton").onclick = () => lightingEnabled = !lightingEnabled;

	document.getElementById("lightPos_Y").addEventListener("mousemove", function(e) {
		if (e.buttons === 1) lightPos[1] = this.value;
	});
	document.getElementById("lightPos_Z").addEventListener("mousemove", function(e) {
		if (e.buttons === 1) lightPos[2] = this.value;
	});
}

let prevCursorX;
function onMouseMove(e) {
	const x = e.clientX;

	if (!prevCursorX) prevCursorX = x;

	const dx = x - prevCursorX;
	camera.pan(dx);

	prevCursorX = x;
}

function onMouseDown(e) {
	const [x, y, z] = cameraToWorldCoords(camera.at.elements);

	if (z < 0 || z > map.length-1 || x < 0 || x > map[0].length-1) return;	// if there were a block, it'd be off the map so there can't be a block

	if (e.buttons === 1 && map[z][x] > 0) map[z][x]--;	// left click - remove block from stack (only if stack has blocks)
	else if (e.buttons === 2) map[z][x]++;				// right click - add block to stack
}

function cameraToWorldCoords(position) {
	const [x, y, z] = position;
	return [Math.floor(x+16), y, Math.floor(z+16)];
}

function onKeydown(e) {
	if (e.key === 'w') camera.moveForward();
	else if (e.key === 's') camera.moveBackward();
	else if (e.key === 'a') camera.moveLeft();
	else if (e.key === 'd') camera.moveRight();
	else if (e.key === 'q') camera.panLeft();
	else if (e.key === 'e') camera.panRight();
	render();
}

let sky;
function initSky() {
	const skyBlue = [135/255, 206/255, 235/255, 1];
	sky = new Cube(0, skyBlue);
	sky.modelMatrix.scale(-64, -64, -64);	// flip cube inside out so normals align with the normals of objects within
	sky.modelMatrix.translate(-0.5, -0.5, -0.5);
	sky.normalMatrix.setInverseOf(sky.modelMatrix).transpose();
}

let floor;
function initFloor() {
	floor = new Cube(1);
	floor.modelMatrix.scale(32, 0, 32);	// scale y to 0 makes a plane
	floor.modelMatrix.translate(-0.5, -0.5, -0.5);
	floor.normalMatrix.setInverseOf(floor.modelMatrix).transpose();
}

const walls = [];
function initWalls() {
	/*
		Use a single cube to draw all the triangles
		Once you draw the triangles, they stay
		So we can then move the cube and draw more
	*/
	for (let y = 0; y < map.length; y++) {
	for (let x = 0; x < map[0].length; x++) {
		const wallHeight = map[y][x];
		for (h = 0; h < wallHeight; h++) {
			const wall = new Cube(2);
			wall.modelMatrix.translate(x-16, h, y-16);
			wall.normalMatrix.setInverseOf(wall.modelMatrix).transpose();
			walls.push(wall);
		}
	}
	}
}

let king;
function initKing() {
	const modelMatrix = new Matrix4();
	modelMatrix.translate(-1, 0, 2);
	king = new King(modelMatrix);
}

let sphere;
function initSphere() {
	sphere = new Sphere(0);
	sphere.modelMatrix.translate(0, 1, 7);
	sphere.modelMatrix.translate(-0.5, -0.5, -0.5);
	sphere.modelMatrix.scale(1, 1, 1);
	sphere.normalMatrix.setInverseOf(sphere.modelMatrix).transpose();
}

function tick() {
	animateLight();
	render();
	updateFPSCounter();
	requestAnimationFrame(tick);
}

const progStart = performance.now();
function animateLight() {
	const dt = (performance.now() - progStart)/1000;
	lightPos[0] = Math.cos(dt) * 10;
}

/** Renders the sky, floor, and map. */
function render() {
	gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
	gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

	gl.uniform1i(u_LightingEnabled, lightingEnabled);
	gl.uniform3f(u_LightPosition, ...lightPos);
	gl.uniform3f(u_CameraPosition, ...camera.eye.elements);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	if (showNormals) {
		sky.material = -2;
		floor.material = -2;
		for (const wall of walls) wall.material = -2;
		sphere.material = -2;
		for (const bp of king.getBodyParts()) bp.material = -2;
	}
	else {
		sky.material = 0;
		floor.material = 1;
		for (const wall of walls) wall.material = 2;
		sphere.material = 0;
		for (const bp of king.getBodyParts()) bp.material = 0;
	}

	const light = new Cube(0, [1,1,0,1]);
	light.modelMatrix.translate(...lightPos);
	light.modelMatrix.scale(-0.5, -0.5, -0.5);	// flip inside out so light inside illuminates the outside instead of inside faces
	light.modelMatrix.translate(-0.5, -0.5, -0.5);
	light.render();

	sky.render();
	floor.render();
	for (const wall of walls) wall.render();
	king.render();
	sphere.render();
}

let start = performance.now();
const fpsCounter = document.getElementById("fpsCounter");
function updateFPSCounter() {
	const ms = performance.now() - start;	// time in-between this frame and the last
	const fps = Math.floor(1000/ms);
	fpsCounter.innerHTML = `ms: ${ms}, fps: ${fps}`;
	start = performance.now();
}