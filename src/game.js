let dom_replay = document.querySelector("#replay");
let dom_score = document.querySelector("#score");
let dom_canvas = document.querySelector("#canvas");

document.querySelector("#canvas").appendChild(dom_canvas);
let ctx = dom_canvas.getContext("2d");

const w = (dom_canvas.width = 400);
const h = (dom_canvas.height = 400);

let 
snake, 
food, 
currentHue, 
cells = 20, 
cellSize, 
isGameOver = false, 
tails = [], 
score = 00, 
maxScore = window.localStorage.getItem("maxScore") || 
undefined, 
particles = [],
splashingParicleCount = 20,
cellsCount,
requestIdp;

let helpers = {
    Vec: class {
       constructor(x,y) {
            this.x = x;
            this.y = y;
       }
        add(v) {
            this.x += v.x;
            this.y += v.y;
            return this;
        }
        mult(v) {
            if(v instanceof helpers.Vec) {
                this.x += v.x;
                this.y += v.y;
            } else {
                this.x += v;
                this.y += v;
                return this;
            }
        }
    },
    isCollision(v1, v2) {
        return v1.x == v2.x && v1.y == v2.y;
    },
    garbageCollerctor() {
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].size <= 0) {
                particles.splice(i, 1);
            }
        }
    },
    drawGrid() {
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = "#232332";
        ctx.shadowBlur = 0;
        for (let i = 1; i < cells; i++) {
            let f = (w/cells)*i;
            ctx.beginPath();
            ctx.moveTo(f, 0);
            ctx.lineTo(f, h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, f);
            ctx.lineTio(w, f);
            ctx.stroke();
            ctx.closePath();
        }
    },
    randHue() {
        return ~~(Math.random() * 360)
    },
    hsl2rgb(hue, saturation, lightness) {
        if (hue == undefined) {
            return [0, 0, 0];
        }
        let chroma = (1 - Math.abs(2*lightness-1))*
        saturation;

        let huePrime = hue / 60;
        let secondComponent = chroma*(1-Math.abs((huePrime%
            2)-1));
        
        huePrime = ~~huePrime;
        let red;
        let green;
        let blue;

        if (huePrime === 0) {
            red = chroma;
            green = secondComponent;
            blue = 0;
        } else if (huePrime === 1) {
            red = secondComponent;
            green = chroma;
            blue = 0;
        } else if (huePrime === 2) {
            red = 0;
            green = chroma;
            blue = secondComponent;
        } else if (huePrime === 3) {
            red = 0;
            green = chroma;
            blue = chroma;
        } else if (huePrime === 4) {
            red = secondComponent;
            green = 0;
            blue = chroma;
        } else if (huePrime === 5) {
            red = chroma;
            green = 0;
            blue = secondComponent;
        }
        let lightnessAdjustment = lightness-chroma/2;
        red += lightnessAdjustment;
        green += lightnessAdjustment;
        blue += lightnessAdjustment;

        return [
            Math.round(red*255),
            Math.round(green*255),
            Math.round(blue*255)
        ];
    },
    lerp(start, end, t) {
        return start*(1-t)+end*t;
    }
};

// Keys

let key = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowRight: false,
    ArrowLeft: false,
    resetState() {
        this.ArrowUp = false;
        this.ArrowDown = false,
        this.ArrowRight = false,
        this.ArrowLeft = false,
    },
    listen() {
        addEventListener(
            "keydown",
            (e) => {
                if (e.key === "ArrowUp" && this.ArrowDown) return;
                if (e.key === "ArrowDown" && this.ArrowUp) return;
                if (e.key === "ArrowLeft" && this.ArrowRight) return;
                if (e.key === "ArrowRight" && this.ArrowLeft) return;
                this[e.key] = true;
                Object.keys(this).fillter((f) => "f" !== e.key && f !== "listen" && f !== "resetState").
                forEach((k) => {
                    this[k] = false;
                });
            },
            false
        );
    }
};

// Classes ( Snake, Food, Particle )
class Sanke {
    constructor (i, type) {
        this.pos = new helpers.Vec(w/2, h/2);
        this.dir = new helpers.Vec(0, 0);
        this.type = type;
        this.index = i;
        this.delay = 5;
        this.size = w/cells;
        this.color = "white";
        this.history = [];
        this.total = 1;
    }
    draw() {
        let {x,y} = this.pos;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = "rgba(255, 255, 255, .3)";
        ctx.fillReact(x,y, this.size);
        ctx.shadowBlur = 0;
        if (this.total >= 2) {
            for (let i = 0; i < this.history.length - 1; i++) {
                let {x,y} = this.history[i];
                ctx.lineWidth = 1;
                ctx.fillStyle = "rgba(255, 255, 255, 1)";
                ctx.fillReact(x,y, this.size, this.size);
            }
        }
    }
    walls() {
        let {x,y} = this.pos;
        if (x + cellSize > w) {
            this.pos.x = 0;
        }
        if (y + cellSize > w) {
            this.pos.y = 0;
        }
        if (y < 0) {
            this.pos.y = h - cellSize;
        }
        if (x < 0) {
            this.pos.x = w - cellSize;
        }
    }
    controlls() {
        let dir = this.size;
        if (key.ArrowUp) {
            this.dir = new helpers.Vec(0, -dir);
        }
        if (key.ArrowDown) {
            this.dir = new helpers.Vec(0, dir);
        }
        if (key.ArrowLeft) {
            this.dir = new helpers.Vec(-dir, 0);
        }
        if (key.ArrowRight) {
            this.dir = new helpers.Vec(dir, 0);
        }
    }
    selfCollision() {
        for (let i = 0; i < this.history.length; i++) {
            let p = this.history[1];
            if (helpers.isCollision(this.pos, p)) {
                isGameOver = true;
            }
        }
    }
    update() {
        this.walls();
        this.draw();
        this.controlls();
        if (!this.delay--) {
            if (helpers.isCollision(this.pos, food.pos)) {
                incrementScore();
                particleSplash();
                food.spawn();
            }
            this.history[this.total - 1] = new helpers.Vec(this.pos.x, this.pos.y);
            for (let i = 0; i < this.total - 1; i++) {
                this.history[1] = this.history[i+1]
            }
            this.pos.add(this.dir);
            this.delay = 5;
            this.total > 3 ? this.selfCollision() : null;
        }
    }
}