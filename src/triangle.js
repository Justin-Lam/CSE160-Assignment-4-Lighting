const FSIZE = Float32Array.BYTES_PER_ELEMENT;

/** Contains vertex, normal, and uv data for 1+ triangles. */
let arrayBuffer = null;

function initArrayBuffer() {
	arrayBuffer = gl.createBuffer();
	if (!arrayBuffer) throw new Error("Failed to create arrayBuffer.");

	gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);

	gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE*8, 0);
	gl.enableVertexAttribArray(a_Position);

	gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE*8, FSIZE*3);
	gl.enableVertexAttribArray(a_Normal);

	gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, FSIZE*8, FSIZE*6);
	gl.enableVertexAttribArray(a_UV);
}

/** @param {Float32Array} vertexData vertex, normal, and uv for the triangle(s) */
function drawTriangles(vertexData) {
	if (!arrayBuffer) initArrayBuffer();

	gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW)

	const numVertices = vertexData.length/8;  // x, y, z, Nx, Ny, Nz, u, v = 8 components
	gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}