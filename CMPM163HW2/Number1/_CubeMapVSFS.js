var skyBoxVS = 
`uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

attribute vec3 position;

varying vec3 vWorldPosition;

void main()
{
	vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	vWorldPosition = worldPosition.xyz;

	vec4 p = viewMatrix * modelMatrix * vec4(position, 1.0);
	gl_Position = projectionMatrix * p;
}`;

var skyBoxFS = 
`precision mediump float;

uniform samplerCube tCube;
varying vec3 vWorldPosition;

void main()
{
	gl_FragColor = textureCube(tCube, vec3(vWorldPosition));
}`;

