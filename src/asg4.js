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

	varying vec3 v_Position;		// vertex position in vertex shader, fragment position in fragment shader
	varying vec3 v_Normal;			// vertex normal in vertex shader, fragment normal in fragment shader
	uniform vec3 u_CameraPosition;

	uniform bool u_PointLight_Enabled;
	uniform vec3 u_PointLight_Color;
	uniform vec3 u_PointLight_Position;

	uniform bool u_SpotLight_Enabled;
	uniform vec3 u_SpotLight_Color;
	uniform vec3 u_SpotLight_Position;
	uniform vec3 u_SpotLight_Direction;
	uniform float u_SpotLight_CosineCutoff;

	void renderMaterial();
	void applyPointLightLighting();
	void applySpotLightLighting();

	void main() {
		renderMaterial();
		if (u_PointLight_Enabled) applyPointLightLighting();
		if (u_SpotLight_Enabled) applySpotLightLighting();
	}

	void renderMaterial() {
		if (u_Material == -2)		gl_FragColor = vec4((v_Normal + 1.0)/2.0, 1.0);	// use normal for debugging
		else if (u_Material == -1) 	gl_FragColor = vec4(v_UV, 1, 1);				// use UV for debugging
		else if (u_Material == 0) 	gl_FragColor = u_Color;							// use color
		else if (u_Material == 1) 	gl_FragColor = texture2D(u_Sampler0, v_UV);		// use TEXTURE0
		else if (u_Material == 2) 	gl_FragColor = texture2D(u_Sampler1, v_UV);		// use TEXTURE1
		else 						gl_FragColor = vec4(1, 0.2, 0.2, 1);			// error, make red	
	}

	void applyPointLightLighting() {
		vec3 l = normalize(u_PointLight_Position - v_Position);
		vec3 n = normalize(v_Normal);
		float nDotL = max(0.0, dot(n, l));

		vec3 e = normalize(u_CameraPosition - v_Position);
		vec3 r = reflect(-l, n);	// l needs to be negative because of how the function works
		float p = 100.0;

		float s = 0.3;
		float a = 0.3;

		vec3 diffuse = vec3(gl_FragColor) * u_PointLight_Color * nDotL;
		vec3 specular = u_PointLight_Color * s * pow(max(dot(e, r), 0.0), p);
		vec3 ambient = vec3(gl_FragColor) * a;
		
		gl_FragColor = vec4(diffuse + specular + ambient, 1.0);
	}

	void applySpotLightLighting() {
		vec3 l = normalize(u_SpotLight_Position - v_Position);
		vec3 d = -normalize(u_SpotLight_Direction);
		float spotCosine = dot(d, l);

		if (spotCosine < u_SpotLight_CosineCutoff) return;

		gl_FragColor += vec4(u_SpotLight_Color * spotCosine, 1.0);
	}
`;

let canvas;
let gl;
let camera;

let pointLight_Enabled = true;
let pointLight_Color = [1,1,1];
let pointLight_Position = [0, 8, -2];

let spotLight_Enabled = true;
let spotLight_Color = [0.1,0.1,0.05];
let spotLight_Position = [5, 2, 8];
let spotLight_Direction = [-1, 0, -1];
let spotLight_CosineCutoff = 0.99;

let showNormals = false;

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

let u_CameraPosition;

let u_PointLight_Enabled;
let u_PointLight_Position;
let u_PointLight_Color;

let u_SpotLight_Enabled;
let u_SpotLight_Color;
let u_SpotLight_Position;
let u_SpotLight_Direction;
let u_SpotLight_CosineCutoff;

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

	u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
	if (!u_ModelMatrix) throw new Error("Failed to get the storage location of u_ModelMatrix.");

	u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
	if (!u_ViewMatrix) throw new Error("Failed to get the storage location of u_ViewMatrix.");

	u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
	if (!u_ProjectionMatrix) throw new Error("Failed to get the storage location of u_ProjectionMatrix.");


	a_Normal = gl.getAttribLocation(gl.program, "a_Normal");
	if (a_Normal < 0) throw new Error("Failed to get the storage location of a_Normal.");

	u_NormalMatrix = gl.getUniformLocation(gl.program, "u_NormalMatrix");
	if (!u_NormalMatrix) throw new Error("Failed to get the storage location of u_NormalMatrix.");


	a_UV = gl.getAttribLocation(gl.program, "a_UV");
	if (a_UV < 0) throw new Error("Failed to get the storage location of a_UV.");

	
	u_Material = gl.getUniformLocation(gl.program, "u_Material");
	if (!u_Material) throw new Error("Failed to get the storage location of u_Material.");


	u_Color = gl.getUniformLocation(gl.program, "u_Color");
	if (!u_Color) throw new Error("Failed to get the storage location of u_Color.");


	u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
	if (!u_Sampler0) throw new Error("Failed to get the storage location of u_Sampler0.");

	u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");
	if (!u_Sampler1) throw new Error("Failed to get the storage location of u_Sampler1.");


	u_CameraPosition = gl.getUniformLocation(gl.program, "u_CameraPosition");
	if (!u_CameraPosition) throw new Error("Failed to get the storage location of u_CameraPosition.");


	u_PointLight_Enabled = gl.getUniformLocation(gl.program, "u_PointLight_Enabled");
	if (!u_PointLight_Enabled) throw new Error("Failed to get the storage location of u_PointLight_Enabled.");

	u_PointLight_Position = gl.getUniformLocation(gl.program, "u_PointLight_Position");
	if (!u_PointLight_Position) throw new Error("Failed to get the storage location of u_PointLight_Position.");

	u_PointLight_Color = gl.getUniformLocation(gl.program, "u_PointLight_Color");
	if (!u_PointLight_Color) throw new Error("Failed to get the storage location of u_PointLight_Color.");

	
	u_SpotLight_Enabled = gl.getUniformLocation(gl.program, "u_SpotLight_Enabled");
	if (!u_SpotLight_Enabled) throw new Error("Failed to get the storage location of u_SpotLight_Enabled.");

	u_SpotLight_Color = gl.getUniformLocation(gl.program, "u_SpotLight_Color");
	if (!u_SpotLight_Color) throw new Error("Failed to get the storage location of u_SpotLight_Color.");

	u_SpotLight_Position = gl.getUniformLocation(gl.program, "u_SpotLight_Position");
	if (!u_SpotLight_Position) throw new Error("Failed to get the storage location of u_SpotLight_Position.");

	u_SpotLight_Direction = gl.getUniformLocation(gl.program, "u_SpotLight_Direction");
	if (!u_SpotLight_Direction) throw new Error("Failed to get the storage location of u_SpotLight_Direction.");

	u_SpotLight_CosineCutoff = gl.getUniformLocation(gl.program, "u_SpotLight_CosineCutoff");
	if (!u_SpotLight_CosineCutoff) throw new Error("Failed to get the storage location of u_SpotLight_CosineCutoff.");
}

function initTextures() {
	const image0 = new Image();
	if (!image0) throw new Error("Failed to create the image object.");
	image0.onload = () => sendToTexture0(image0);
	image0.src = "assets/gigaGrass.jpg";

	const image1 = new Image();
	if (!image1) throw new Error("Failed to create the image object.");
	image1.onload = () => sendToTexture1(image1);
	image1.src = "assets/stone.jpg";
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
	document.getElementById("togglePointLightButton").onclick = () => pointLight_Enabled = !pointLight_Enabled;
	document.getElementById("toggleSpotLightButton").onclick = () => spotLight_Enabled = !spotLight_Enabled;
	document.getElementById("toggleNormalsButton").onclick = () => showNormals = !showNormals;

	document.getElementById("lightPos_Y").addEventListener("mousemove", function(e) {
		if (e.buttons === 1) pointLight_Position[1] = this.value;
	});
	document.getElementById("lightPos_Z").addEventListener("mousemove", function(e) {
		if (e.buttons === 1) pointLight_Position[2] = this.value;
	});

	document.getElementById("lightColor_R").addEventListener("mousemove", function(e) {
		if (e.buttons === 1) pointLight_Color[0] = this.value/100;
	});
	document.getElementById("lightColor_G").addEventListener("mousemove", function(e) {
		if (e.buttons === 1) pointLight_Color[1] = this.value/100;
	});
	document.getElementById("lightColor_B").addEventListener("mousemove", function(e) {
		if (e.buttons === 1) pointLight_Color[2] = this.value/100;
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
	pointLight_Position[0] = Math.cos(dt) * 10;
}

/** Renders the sky, floor, and map. */
function render() {
	gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
	gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

	gl.uniform3f(u_CameraPosition, ...camera.eye.elements);

	gl.uniform1i(u_PointLight_Enabled, pointLight_Enabled);
	gl.uniform3f(u_PointLight_Color, ...pointLight_Color);
	gl.uniform3f(u_PointLight_Position, ...pointLight_Position);

	gl.uniform1i(u_SpotLight_Enabled, spotLight_Enabled);
	gl.uniform3f(u_SpotLight_Color, ...spotLight_Color);
	gl.uniform3f(u_SpotLight_Position, ...spotLight_Position);
	gl.uniform3f(u_SpotLight_Direction, ...spotLight_Direction);
	gl.uniform1f(u_SpotLight_CosineCutoff, spotLight_CosineCutoff);

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

	const pointLightCube = new Cube(0, [...pointLight_Color, 1]);
	pointLightCube.modelMatrix.translate(...pointLight_Position);
	pointLightCube.modelMatrix.scale(-0.5, -0.5, -0.5);	// flip inside out so light inside illuminates the outside instead of inside faces
	pointLightCube.modelMatrix.translate(-0.5, -0.5, -0.5);
	pointLightCube.render();

	const spotLightCube = new Cube(0, [1,1,0,1]);
	spotLightCube.modelMatrix.translate(...spotLight_Position);
	spotLightCube.modelMatrix.scale(-0.5, -0.5, -0.5);	// flip inside out so light inside illuminates the outside instead of inside faces
	spotLightCube.modelMatrix.translate(-0.5, -0.5, -0.5);
	spotLightCube.render();

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