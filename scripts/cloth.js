class Point {
    constructor (x, y, z, pinned, force_mult=1) {
        this.pinned = pinned
        this.force_mult = force_mult;
        this.ax = 0;
        this.ay = 0;
        this.az = 0;
        this.x = x;
        this.y = y;
        this.z = z;
        this.px = x;
        this.py = y;
        this.pz = z;
    }

    update(mousex, mousey, dt=0.1) {
        if (this.pinned) {
            return;
        }
        this.ay += 3;   // gravity
        let dx = mousex - this.x;
        let dy = mousey - this.y;
        let dz = 0 - this.z;
        let d = Math.max(Math.hypot(dx, dy, dz), 0.5); // prevent division by 0
        
        if (d<50*this.force_mult) {
            console.log("chat")
            let g = 100;
            let fx = g*dx/d;
            let fy = g*dy/d;
            let fz = g*dz/d;
            this.ax -= fx;
            this.ay -=fy;
            this.az -= fz;
        }

        let vx = this.x - this.px;
        let vy = this.y - this.py;
        let vz = this.z - this.pz;
        this.px = this.x;
        this.py = this.y;
        this.pz = this.z;

        this.ax *= this.force_mult;
        this.ay *= this.force_mult;
        this.az *= this.force_mult;

        this.x += vx*0.99 + this.ax*dt*dt;
        this.y += vy*0.99 + this.ay*dt*dt;
        this.z += vz*0.99 + this.az*dt*dt;
        this.ax = 0; this.ay = 0; this.az = 0;
    }
}

class Constraint{
    constructor(p1, p2, L, k=0.03) {
        let max_d_mlt=2.5
        this.k = k;
        this.active = true;
        this.max_d = L*max_d_mlt;
        this.p1 = p1;
        this.p2 = p2;
        this.L = L;
    }
    update_a(mousex, mousey, mouseclicked) {
        if (!this.active) {
            return;
        }

        let dx = this.p1.x - this.p2.x;
        let dy = this.p1.y - this.p2.y;
        let dz = this.p1.z - this.p2.z;
        let d = Math.hypot(dx, dy, dz);
        if (d == 0) return;
        if (d >= this.max_d) {
            this.active = false;
            return;
        }

        const distToSegment = (px, py, x1, y1, x2, y2) => {
            const l2 = (x2 - x1)**2 + (y2 - y1)**2;
            if (l2 === 0) return Math.hypot(px - x1, py - y1);
            let t = ((px - x1)*(x2 - x1) + (py - y1)*(y2 - y1)) / l2;
            t = Math.max(0, Math.min(1, t)); // clamp to [0,1]
            const projX = x1 + t*(x2 - x1);
            const projY = y1 + t*(y2 - y1);
            return Math.hypot(px - projX, py - projY);
        }

        let d2 = distToSegment(mousex, mousey, this.p1.x, this.p1.y, this.p2.x, this.p2.y);
        if (d2 < 10 && mouseclicked) {
            this.active = false;
            return;
        }

        let f = this.k * (d - this.L);
        let fx = f * dx;
        let fy = f * dy;
        let fz = f * dz;

        this.p1.ax -= fx / 2;
        this.p1.ay -= fy / 2;
        this.p1.az -= fz / 2;
        this.p2.ax += fx / 2;
        this.p2.ay += fy / 2;
        this.p2.az += fz / 2;
    }


    draw(ctx){
        if (!this.active) {
            return;
        }
        // console.log(this.p1.x, this.p2.x);
        let c = Math.max(0, Math.min(255, (this.p1.z + this.p2.z) / 100 * 255
        ));

        ctx.strokeStyle = `rgb(${c}, ${c}, ${c})`;

        ctx.lineWidth = 0.1;
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();
    }
}

class Cloth {
    constructor (height, width, ncols, canvas) {
        this.mouseclicked = false;
        this.mousex = 0; this.mousey = 0;
        this.canvas = canvas
        const hspace = width/ncols;
        const vspace = hspace;
        console.log(vspace);
        let k = 0.005 * (31/vspace);
        let nrows = Math.floor(height / vspace);
        this.constraints = [];
        this.points = [];
        ncols += 1;
        nrows += 1;
   
        let ps = [];
        for (let row=0; row<nrows; row+=1){
            let pps = [];
            for (let col=0; col<ncols; col+=1){
                let y = row*vspace;
                let x = col*hspace;
                let p = new Point(x, y, 0, row==0, Math.pow((vspace/31), 2));
                pps.push(p);
            }
            ps.push(pps);
        }
        
        for (let row=0; row<nrows; row+=1){
            for (let col=0; col<ncols; col+=1){
                if (row < nrows - 1) {
                    this.constraints.push(new Constraint(ps[row][col], ps[row+1][col], vspace, k));
                }
                if (col < ncols - 1) {
                    this.constraints.push(new Constraint(ps[row][col], ps[row][col+1], vspace, k));
                }
                if (row < nrows - 2) {
                    this.constraints.push(new Constraint(ps[row][col], ps[row+2][col], 2*vspace, k));
                }
                if (col < ncols - 2) {
                    this.constraints.push(new Constraint(ps[row][col], ps[row][col+2], 2*vspace, k));
                }
                if (row < nrows - 1 && col < ncols - 1) {
                    this.constraints.push(new Constraint(ps[row][col], ps[row+1][col+1], Math.sqrt(2)*vspace, Math.sqrt(2)*k));
                }
                if (row > 0 && col < ncols - 1) {
                    this.constraints.push(new Constraint(ps[row][col], ps[row-1][col+1], Math.sqrt(2)*vspace, Math.sqrt(2)*k));
                }

            }
            this.points.push(...ps[row]);
        }
        
    }

    draw(){
        const ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 0.1;
        ctx.beginPath();
        this.constraints.forEach(c => {
            if(c.active){

                ctx.moveTo(c.p1.x, c.p1.y);
                ctx.lineTo(c.p2.x, c.p2.y);

            }
        });
        ctx.stroke();
    }


    update() {
        for(let i = 0; i<5; i++){
            this.constraints.forEach(item => item.update_a(this.mousex, this.mousey, this.mouseclicked));
        }
        this.points.forEach(item => item.update(this.mousex, this.mousey));
        let margin = 500;
        let to_delete = new Set();
        this.constraints.forEach(c => {
            if (c.p1.x < -margin || c.p1.x > this.canvas.width + margin || c.p2.x < -margin || c.p2.x > this.canvas.width + margin || c.p1.y < -margin || c.p1.y > this.canvas.height + margin || c.p2.y < -margin || c.p2.y > this.canvas.height + margin) {
                c.active = false;
                to_delete.add(c.p1);
                to_delete.add(c.p2);
            }
        })

        this.points = this.points.filter(p => !to_delete.has(p));
        this.constraints = this.constraints.filter(c => !(to_delete.has(c.p1) || to_delete.has(c.p2)));
        this.draw();
    }
}


cloth_canvas = document.getElementById("cloth_canvas");

const dpr = window.devicePixelRatio || 1;
cloth_canvas.width = cloth_canvas.clientWidth * dpr;
cloth_canvas.height = cloth_canvas.clientHeight * dpr;

const ctx = cloth_canvas.getContext("2d");
ctx.scale(dpr, dpr);
let c = new Cloth(cloth_canvas.height, cloth_canvas.width, 50, cloth_canvas);
cloth_canvas.addEventListener("mousemove", (e) => {
    // Get bounding rect to account for canvas position on page
    const rect = cloth_canvas.getBoundingClientRect();
    c.mousex = (e.clientX - rect.left);
    c.mousey = (e.clientY - rect.top);
});

cloth_canvas.addEventListener("mouseup", (e) =>{
    c.mouseclicked = false;
}
)

cloth_canvas.addEventListener("mousedown", (e) =>{
    c.mouseclicked = true;
}
)

cloth_canvas.addEventListener("mouseleave", () => {
    c.mousex = -1000; // move far away so it doesn't affect points
    c.mousey = -1000;
});
setInterval(() => c.update(), 20);
