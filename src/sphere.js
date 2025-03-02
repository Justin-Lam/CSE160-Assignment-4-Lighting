class Sphere {
	/** Position, normal, and uv. */
	vertexData;

	modelMatrix = new Matrix4();
	material;
	color = [1,1,1,1];	// white

	radius = 0.5;
	step = Math.PI/10;	// in angles

	/**
	 * Required to specify material.
	 * @param {number} material -2: debug (normals), -1: debug (uv), 0: color, 1: texture0, 2: texture1
	 */
	constructor(material, color) {
		this.initVertexData();
		this.material = material;
		if (color) this.color = color;
	}

	initVertexData()
	{
		const r = this.radius;
		const s = this.step;
		const cos = a => Math.cos(a);
		const sin = a => Math.sin(a);

		let vertexData = [];
		for (let t = 0; t < Math.PI; t += s) {		// theta = [0, 180] degrees
		for (let p = 0; p < Math.PI * 2; p += s) {	// phi = [0, 360] degrees
			const v1 = [r*sin(t)*cos(p), r*sin(t)*sin(p), r*cos(t)];
			const v2 = [r*sin(t+s)*cos(p), r*sin(t+s)*sin(p), r*cos(t+s)];
			const v3 = [r*sin(t)*cos(p+s), r*sin(t)*sin(p+s), r*cos(t)];
			const v4 = [r*sin(t+s)*cos(p+s), r*sin(t+s)*sin(p+s), r*cos(t+s)];

			// use t and p as u and v, scale t and p back to range [0, 1]
			const uv1 = [t/Math.PI, r/(2*Math.PI)];
			const uv2 = [(t+s)/Math.PI, r/(2*Math.PI)];
			const uv3 = [t/Math.PI, (r+s)/(2*Math.PI)];
			const uv4 = [(t+s)/Math.PI, (r+s)/(2*Math.PI)];

			// for spheres, each point's normal is the point, so you can pass in the point for the normal
			// pass in position, then normal, then uv
			vertexData = vertexData.concat(v1).concat(v1).concat(uv1);
			vertexData = vertexData.concat(v2).concat(v2).concat(uv2);
			vertexData = vertexData.concat(v4).concat(v4).concat(uv4);

			vertexData = vertexData.concat(v1).concat(v1).concat(uv1);
			vertexData = vertexData.concat(v4).concat(v4).concat(uv4);
			vertexData = vertexData.concat(v3).concat(v3).concat(uv3);
		}}

		this.vertexData = new Float32Array(vertexData);
	}

	render() {
		gl.uniformMatrix4fv(u_ModelMatrix, false, this.modelMatrix.elements);
		gl.uniform1i(u_Material, this.material);
		gl.uniform4f(u_Color, ...this.color);

		drawTriangles(this.vertexData);
	}
}