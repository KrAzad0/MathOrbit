# MathOrbit

**MathOrbit** is an open-source interactive mathematics and graphing engine built from first principles in the browser.

The goal is to grow from a lightweight Desmos-style graphing calculator into a broader GeoGebra-style mathematical workspace for graphing, geometry, calculus, numerical methods, differential equations, linear algebra, and scientific visualization.

## MathOrbit v0.1

The first working version includes:

- Interactive 2D Cartesian graph
- Pan by dragging
- Zoom with mouse wheel or toolbar controls
- Adaptive grid and axis labels
- Multiple function expressions
- Show/hide and delete expressions
- Built-in expression tokenizer and parser
- Abstract syntax tree evaluation without `eval()`
- Constants `pi` and `e`
- Functions including `sin`, `cos`, `tan`, `sqrt`, `abs`, `exp`, `log`, and more
- Local browser persistence for expressions
- Responsive layout for desktop and mobile
- No plotting framework and no math-expression dependency

## Try expressions

```text
sin(x)
x^2 / 4 - 2
2*cos(x) + sin(2*x)
sqrt(abs(x))
exp(-x^2)
1/x
```

You can also type an expression as `y = sin(x)`.

## How it works

```text
User expression
      ↓
Tokenizer
      ↓
Recursive-descent parser
      ↓
Abstract Syntax Tree (AST)
      ↓
Numerical evaluator f(x)
      ↓
Coordinate transform
      ↓
HTML Canvas renderer
```

The browser canvas works in pixels while mathematics works in Cartesian coordinates. MathOrbit maintains a transform between these two coordinate systems and resamples each visible function across the screen whenever the viewport changes.

## Project structure

```text
MathOrbit/
├── index.html                  # Application interface
├── styles.css                  # Responsive visual design
├── app.js                      # Parser, evaluator, graph renderer and UI logic
├── README.md
├── LICENSE
└── .github/
    └── workflows/
        └── pages.yml           # GitHub Pages deployment
```

## Expression grammar

Current grammar:

```text
expression  → addition
addition    → multiply (("+" | "-") multiply)*
multiply    → unary (("*" | "/") unary)*
unary       → ("+" | "-") unary | power
power       → primary ("^" unary)?
primary     → number | x | constant | function "(" expression ")" | "(" expression ")"
```

## Development roadmap

### v0.2 — Better graphing
- Parametric curves
- Piecewise/domain restrictions
- Function intersections and roots
- Trace mode
- Shareable graph state in the URL

### v0.3 — Dynamic mathematics
- Variables and sliders
- Function definitions such as `f(x)=...`
- Tables of values
- Numerical derivative and integral tools

### v0.4 — Geometry
- Draggable points
- Lines and segments
- Circles
- Distances and angles
- Geometric intersections

### v0.5 — Scientific tools
- ODE solvers
- Vector fields
- Complex-plane visualization
- Matrix and linear algebra tools
- Statistics

### v1.0 — MathOrbit scientific workspace
- 3D surfaces
- Differential equations
- Physics visualization
- Quantum-mechanics wavefunctions
- Numerical simulation modules

## Run locally

Because MathOrbit v0.1 uses only static web files, you can open `index.html` directly or serve the directory using any static HTTP server.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

This repository includes a GitHub Actions workflow for Pages. In the repository settings, select **GitHub Actions** as the Pages build and deployment source if it is not already enabled.

Expected public URL:

```text
https://krazad0.github.io/MathOrbit/
```

## Philosophy

MathOrbit is intended to be more than a clone. Its long-term direction is a transparent mathematical engine where the parser, numerical algorithms, coordinate systems, and renderers can be studied and extended by students, researchers, and developers.

## License

MIT License.
