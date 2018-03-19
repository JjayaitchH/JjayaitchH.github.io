var SDFVS = `
        varying vec3 v_pos;
        void main() {
            v_pos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

var SDFFS = `
        const int MAX_MARCHING_STEPS = 300;
        const float EPISOLON = 0.0001;
        const float START = 0.0;
        const float END = 300.0;

        uniform vec2 resolution;
        uniform float time;

        varying vec3 v_pos;

        float makeEllipsoid(vec3 pos, vec3 rad)
        {
            return (length(pos /rad) - 1.0) * min(min(rad.x, rad.y), rad.z);
        }

        float makeBox(vec3 a, vec3 b)
        {
            return length(max(abs(a) - b, 0.0));
        }

        float makePhere(vec3 a, float s)
        {
            return length(a) - s;
        }

        float multiply(vec3 pos, vec3 cen)
        {
            vec3 q = mod(pos, cen) - 0.5 * cen;
            return makeEllipsoid(q, vec3(.1, .2, .3));
        }

        float blend(float a, float b, float change)
        {
            return change * a + (1.0 - change) * b;
        }

        float findUnion(float a, float b)
        {
            return min(a, b);
        }
        //Scene SDF + geometry

        float sceneRender(vec3 point)
        {
            float offset = 1.0; //offset so that separate geometry doesn't clash
            float many = multiply(point, point + vec3(1.0, 1.0, 1.0));

            float box = makeBox(point, vec3(.1, .1, .1));
            float sphere = makePhere(point, .1);

            float box2 = makeBox(point, vec3(1.0, 1.0, 1.0));
            float sphere2 = makePhere(point, .1);

            float shapeBlend = blend(box2, sphere2, (sin(time * 3.0) + 1.0) / sin(time));

            float combo = findUnion(box, sphere);
            float geom = findUnion(shapeBlend, many);
            //float many = makeEllipsoid(point, vec3(.01, .02, .03));
            return geom;

        }
        // Cheated and copied from shader toy example:
        // https://www.shadertoy.com/view/lt33z7
        vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord) {
            vec2 xy = fragCoord;
            float z = size.y / tan(radians(fieldOfView) / 2.0);
            return normalize(vec3(xy, -z));
        }

        // Cheated and copied from shader toy example:
        // https://www.shadertoy.com/view/lt33z7
        mat3 rayMarchViewMatrix(vec3 cam, vec3 center, vec3 up) {
            // Based on gluLookAt man page
            vec3 f = normalize(center - cam);
            vec3 s = normalize(cross(f, up));
            vec3 u = cross(s, f);
            return mat3(s, u, -f);
        }
		//also from https://www.shadertoy.com/view/lt33z7
        vec3 estimateNormal(vec3 p) {
        return normalize(vec3(
        sceneRender(vec3(p.x + EPISOLON, p.y, p.z)) - sceneRender(vec3(p.x - EPISOLON, p.y, p.z)),
        sceneRender(vec3(p.x, p.y + EPISOLON, p.z)) - sceneRender(vec3(p.x, p.y - EPISOLON, p.z)),
        sceneRender(vec3(p.x, p.y, p.z  + EPISOLON)) - sceneRender(vec3(p.x, p.y, p.z - EPISOLON))
        ));
        }   

		//also from https://www.shadertoy.com/view/lt33z7
        vec3 phongContribForLight(vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye,
                              vec3 lightPos, vec3 lightIntensity) {
        vec3 N = estimateNormal(p);
        vec3 L = normalize(lightPos - p);
        vec3 V = normalize(eye - p);
        vec3 R = normalize(reflect(-L, N));
        
        float dotLN = dot(L, N);
        float dotRV = dot(R, V);
        
        if (dotLN < 0.0) {
            // Light not visible from this point on the surface
            return vec3(0.0, 0.0, 0.0);
        } 
        
        if (dotRV < 0.0) {
            // Light reflection in opposite direction as viewer, apply only diffuse
            // component
            return lightIntensity * (k_d * dotLN);
        }
        return lightIntensity * (k_d * dotLN + k_s * pow(dotRV, alpha));
    }     
		//also from https://www.shadertoy.com/view/lt33z7
        vec3 phongIllumination(vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye) {
        const vec3 ambientLight = 0.5 * vec3(1.0, 1.0, 1.0);
        vec3 color = ambientLight * k_a;        
        vec3 light1Pos = vec3(4.0 * sin(time), 2.0, 4.0 * cos(time));
        vec3 light1Intensity = vec3(0.7, 0.7, 0.7);
            
        color += phongContribForLight(k_d, k_s, alpha, p, eye, light1Pos, light1Intensity);
        return color;

    }
        float rayMarch(vec3 cam, vec3 dir, float start, float end) {
            float step = start;
            for(int i = 0; i < MAX_MARCHING_STEPS; i++) {
                float dist = sceneRender(cam + step * dir);
                if(dist < EPISOLON) {
                    // I am inside the geometry
                    return step;
                }

                step += dist;
                if(step >= end) {
                    return end;
                }
            }

            return end;
        }

        void main() {
            vec3 cam = vec3(0.0,0.0,10.0);
            vec3 dir = rayDirection(50.0, resolution, v_pos.xy);

            mat3 viewToWorld = rayMarchViewMatrix(cam, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
            vec3 worldDir = viewToWorld * dir;

            float dist = rayMarch(cam, dir, START, END);
            if(dist > END - EPISOLON) {
                gl_FragColor = vec4(0.0,0.0,0.0,1.0);
                return;
            }
        
        vec3 pos = cam + dist * dir;
        
        vec3 K_a = vec3(cos(time), 0.5, 0.5);
        vec3 K_d = vec3(tan(0.5), cos(time), 0.5);
        vec3 K_s = vec3(1.0, 1.0, 1.0 * tan(time));
        float shininess = 10.0;
        
        vec3 color = phongIllumination(K_a, K_d, K_s, shininess, pos, cam);
        
        gl_FragColor = vec4(color, 1.0);
        }
    `;