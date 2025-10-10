use wasm_bindgen::prelude::*;

/// Monotone (strictly increasing) cubic spline via Fritsch–Carlson.
/// References: Fritsch & Carlson (1980), "Monotone Piecewise Cubic Interpolation".
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct MonotoneCubicSpline {
    t: Vec<f64>, // knots (strictly increasing)
    y: Vec<f64>, // values (strictly increasing)
    m: Vec<f64>, // first-derivative at knots, shape-preserving
}

#[wasm_bindgen]
impl MonotoneCubicSpline {
    /// Build a strictly increasing, monotone spline.
    pub fn new(t: Vec<f64>, y: Vec<f64>) -> Result<Self, String> {
        let n = t.len();
        if n < 2 || y.len() != n {
            return Err("Need at least two points".into());
        }
        // Validate monotonicity and finiteness
        for i in 0..n {
            if !t[i].is_finite() || !y[i].is_finite() {
                return Err("NaN input".into());
            }
            if i + 1 < n {
                if t[i + 1].partial_cmp(&t[i]) != Some(std::cmp::Ordering::Greater) {
                    return Err(format!("Non-increasing times at index {}", i));
                }
                if y[i + 1].partial_cmp(&y[i]) != Some(std::cmp::Ordering::Greater) {
                    return Err(format!("Non-increasing values at index {}", i));
                }
            }
        }

        // Secant slopes (all > 0 because y and t strictly increase)
        let mut h = Vec::with_capacity(n - 1);
        let mut delta = Vec::with_capacity(n - 1);
        for i in 0..(n - 1) {
            let hi = t[i + 1] - t[i];
            let di = (y[i + 1] - y[i]) / hi;
            h.push(hi);
            delta.push(di);
        }

        // Initial endpoint derivatives using one-sided three-point estimates,
        // then clamped to preserve monotonicity.
        let mut m = vec![0.0; n];
        if n == 2 {
            // With two points, just use the secant slope at both ends.
            m[0] = delta[0];
            m[1] = delta[0];
        } else {
            // Interior initial guesses: average of adjacent secants
            for i in 1..(n - 1) {
                m[i] = 0.5 * (delta[i - 1] + delta[i]);
            }
            // Endpoints (Fritsch–Butland style, then clamped)
            m[0] = 2.0 * delta[0] - delta[1];
            m[n - 1] = 2.0 * delta[n - 2] - delta[n - 3];

            // Clamp endpoints to [0, 3*neighbor_delta] to prevent overshoot
            if m[0] < 0.0 {
                m[0] = 0.0;
            }
            if m[0] > 3.0 * delta[0] {
                m[0] = 3.0 * delta[0];
            }

            if m[n - 1] < 0.0 {
                m[n - 1] = 0.0;
            }
            if m[n - 1] > 3.0 * delta[n - 2] {
                m[n - 1] = 3.0 * delta[n - 2];
            }

            // If a local secant changes sign (not possible here since all > 0),
            // set m[i]=0. For completeness:
            for i in 1..(n - 1) {
                if delta[i - 1] * delta[i] <= 0.0 {
                    m[i] = 0.0;
                }
            }

            // Fritsch–Carlson non-overshoot scaling per interval
            for i in 0..(n - 1) {
                if delta[i] == 0.0 {
                    // would flatten — but won’t happen with strictly increasing y
                    m[i] = 0.0;
                    m[i + 1] = 0.0;
                } else {
                    let a = m[i] / delta[i];
                    let b = m[i + 1] / delta[i];
                    let s = a * a + b * b;
                    if s > 9.0 {
                        let tau = 3.0 / s.sqrt();
                        m[i] = tau * a * delta[i];
                        m[i + 1] = tau * b * delta[i];
                    }
                }
            }
        }

        Ok(Self { t, y, m })
    }

    /// Evaluate the spline at x. Outside the knot range, performs linear extrapolation
    /// using the nearest endpoint slope (monotone and simple).
    pub fn eval(&self, x: f64) -> f64 {
        let n = self.t.len();
        if x <= self.t[0] {
            return self.y[0] + (x - self.t[0]) * self.m[0];
        }
        if x >= self.t[n - 1] {
            return self.y[n - 1] + (x - self.t[n - 1]) * self.m[n - 1];
        }

        // Binary search for interval i such that t[i] <= x <= t[i+1]
        let mut lo = 0usize;
        let mut hi = n - 1;
        while lo + 1 < hi {
            let mid = (lo + hi) / 2;
            if self.t[mid] <= x {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        let i = lo;

        let h = self.t[i + 1] - self.t[i];
        let s = (x - self.t[i]) / h; // in [0,1]
        let y0 = self.y[i];
        let y1 = self.y[i + 1];
        let m0 = self.m[i];
        let m1 = self.m[i + 1];

        // Cubic Hermite basis
        let h00 = (2.0 * s - 3.0) * s * s + 1.0; // 2s^3 - 3s^2 + 1
        let h10 = (s - 2.0) * s * s + s; // s^3 - 2s^2 + s
        let h01 = (-2.0 * s + 3.0) * s * s; // -2s^3 + 3s^2
        let h11 = (s - 1.0) * s * s; // s^3 - s^2

        h00 * y0 + h10 * h * m0 + h01 * y1 + h11 * h * m1
    }
}

impl MonotoneCubicSpline {
    /// Convenience: evaluate many x’s.
    pub fn eval_many<I: IntoIterator<Item = f64>>(&self, xs: I) -> Vec<f64> {
        xs.into_iter().map(|x| self.eval(x)).collect()
    }

    /// Accessors
    pub fn knots(&self) -> (&[f64], &[f64]) {
        (&self.t, &self.y)
    }
    pub fn slopes(&self) -> &[f64] {
        &self.m
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use plotters::prelude::*;

    #[test]
    fn monotone_basic() {
        let t = vec![0.0, 1.0, 2.0, 2.1, 4.0, 5.0];
        let y = vec![0.0, 0.5, 0.75, 1.76, 3.0, 4.0];
        let s = MonotoneCubicSpline::new(t.clone(), y.clone()).unwrap();

        // Check interpolation at knots
        for i in 0..t.len() {
            let yi = s.eval(t[i]);
            assert!((yi - y[i]).abs() < 1e-12);
        }

        // Check strictly increasing samples
        let xs: Vec<f64> = (0..50).map(|k| 5.0 * (k as f64) / 49.0).collect();
        let ys = s.eval_many(xs.clone());
        for i in 0..(ys.len() - 1) {
            assert!(ys[i + 1] > ys[i], "not strictly increasing at step {}", i);
        }

        // Graph it
        let root = BitMapBackend::new("spline.png", (640, 480)).into_drawing_area();
        root.fill(&WHITE).unwrap();
        let mut chart = ChartBuilder::on(&root)
            .margin(10)
            .caption("Monotone Cubic Spline", ("sans-serif", 40))
            .x_label_area_size(30)
            .y_label_area_size(30)
            .build_cartesian_2d(-0.5..5.5, -0.5..4.5)
            .unwrap();
        chart.configure_mesh().draw().unwrap();
        chart
            .draw_series(LineSeries::new(
                xs.iter().zip(ys.iter()).map(|(&x, &y)| (x, y)),
                &BLUE,
            ))
            .unwrap()
            .label("spline")
            .legend(|(x, y)| PathElement::new(vec![(x, y), (x + 20, y)], BLUE));
        chart
            .draw_series(PointSeries::of_element(
                t.iter().zip(y.iter()).map(|(&x, &y)| (x, y)),
                5,
                &RED,
                &|c, s, st| {
                    EmptyElement::at(c)    // We want to construct a composed element on-the-fly
                        + Circle::new((0, 0), s, st.filled())
                        + Text::new(format!("({:.1}, {:.1})", c.0, c.1), (10, -10), ("sans-serif", 15))
                },
            ))
            .unwrap()
            .label("knots")
            .legend(|(x, y)| Circle::new((x + 10, y), 5, RED.filled()));
        chart
            .configure_series_labels()
            .border_style(BLACK)
            .draw()
            .unwrap();
        root.present().unwrap();
    }
}
