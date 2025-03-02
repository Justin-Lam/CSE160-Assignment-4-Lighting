class Cube {
	/** Position, normal, and uv. */
	vertexData = new Float32Array([
		// front
		0,0,0, 0,0,-1, 0,0,		1,1,0, 0,0,-1, 1,1,		1,0,0, 0,0,-1, 1,0,
		0,0,0, 0,0,-1, 0,0,		0,1,0, 0,0,-1, 0,1,		1,1,0, 0,0,-1, 1,1,
		// back
		0,0,1, 0,0,1, 0,0,		1,1,1, 0,0,1, 1,1,		1,0,1, 0,0,1, 1,0,
		0,0,1, 0,0,1, 0,0,		0,1,1, 0,0,1, 0,1,		1,1,1, 0,0,1, 1,1,
		// top
		0,1,0, 0,1,0, 0,0,		1,1,1, 0,1,0, 1,1,		1,1,0, 0,1,0, 1,0,
		0,1,0, 0,1,0, 0,0,		0,1,1, 0,1,0, 0,1,		1,1,1, 0,1,0, 1,1,
		// bottom
		0,0,0, 0,-1,0, 0,0,		1,0,1, 0,-1,0, 1,1,		1,0,0, 0,-1,0, 1,0,
		0,0,0, 0,-1,0, 0,0,		0,0,1, 0,-1,0, 0,1,		1,0,1, 0,-1,0, 1,1,
		// left
		0,0,0, -1,0,0, 0,0,		0,1,1, -1,0,0, 1,1,		0,0,1, -1,0,0, 1,0,
		0,0,0, -1,0,0, 0,0,		0,1,0, -1,0,0, 0,1,		0,1,1, -1,0,0, 1,1,
		// right
		1,0,0, 1,0,0, 0,0,		1,1,1, 1,0,0, 1,1,		1,0,1, 1,0,0, 1,0,
		1,0,0, 1,0,0, 0,0,		1,1,0, 1,0,0, 0,1,		1,1,1, 1,0,0, 1,1,
	]);

	modelMatrix = new Matrix4();
	normalMatrix = new Matrix4();
	material;
	color = [1,1,1,1];	// white

	/**
	 * Required to specify material.
	 * @param {number} material -2: debug (normals), -1: debug (uv), 0: color, 1: texture0, 2: texture1
	 */
	constructor(material, color) {
		this.material = material;
		if (color) this.color = color;
	}

	render() {
		gl.uniformMatrix4fv(u_ModelMatrix, false, this.modelMatrix.elements);
		gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);
		gl.uniform1i(u_Material, this.material);
		gl.uniform4f(u_Color, ...this.color);

		drawTriangles(this.vertexData);
	}
}