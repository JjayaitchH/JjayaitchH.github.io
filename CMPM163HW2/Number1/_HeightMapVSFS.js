var heightMapVS = `
	
	uniform mat4 modelMatrix;
	uniform mat4 viewMatrix;
	uniform mat4 projectionMatrix;
	uniform sampler2D tPic;
	uniform float displaceAmt;

	attribute vec3 position;
	attribute vec2 uv;
	attribute vec3 normal;

	varying float vDisplace;
	varying vec2 vUv;

	precision mediump float;

	void main()
	{
		vUv = uv;
		vec4 clr = texture2D(tPic, uv);
		vDisplace = clr.r * displaceAmt;
		vec3 newPosition = (position.xyz + normal.xyz * vDisplace).xyz;

		gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(newPosition, 1.0);
	}

`;

var heightMapFS = `
	precision mediump float;

	uniform sampler2D tDirt, tGrass, tIce;

	varying float vDisplace;
	varying vec2 vUv;

	void main()
	{
		vec4 dirt = texture2D(tDirt, vUv);
		vec4 grass = texture2D(tGrass, vUv);
		vec4 ice = texture2D(tIce, vUv);

		float zOff = vDisplace;

		vec4 mix1 = mix(grass, dirt, min(1.0,zOff*8.0));
		vec4 mix2 = max(vec4(1.0), mix(dirt, ice, zOff) * 1.5);
		vec4 mix3 = mix(mix1, mix2, zOff);

		gl_FragColor = vec4(mix3.rgb, 1.0);
	}	
`;