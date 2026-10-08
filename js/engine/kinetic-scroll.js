function d(a, l) {
  let r = 0, u = 0, i = 0, M = false, n = 0, o = 0;
  const c = (f) => Math.max(a, Math.min(l, f));
  return { tryk(f) {
      n = f;
      o = r;
      u = r;
      M = true;
    }, flyt(f) {
      let e = o - (f - n);
      if (e < a) {
        e = a + (e - a) * 0.5;
      }
      if (e > l) {
        e = l + (e - l) * 0.5;
      }
      u = e;
    }, slip() {
      i = (u - r) * 23;
      M = false;
    }, tik(f) {
      const e = f * 1e-3;
      if (!M) {
        let t = u, s = i, h = s * e;
        if (t < a) {
          if (t + h < a) {
            s += 18 * (a - t) * e;
          } else {
            s = 0;
            h = a - t;
          }
        }
        if (t > l) {
          if (t + h > l) {
            s -= 18 * (t - l) * e;
          } else {
            s = 0;
            h = l - t;
          }
        }
        t += h;
        u = t;
        const y = t < a && s < 0 || t > l && s > 0 ? 10 : 4;
        s -= s * y * e;
        i = t >= a && t <= l && Math.abs(s) < 0.01 ? 0 : s;
      }
      const k = u - r;
      if (k !== 0) {
        let t = k * 23 * e;
        if (Math.abs(t) > Math.abs(k)) {
          t = k;
        }
        r += t;
      }
      r = c(r);
      return Math.trunc(r);
    }, flytTil(f) {
      r = c(Math.min(f, Math.trunc(l)));
      u = r;
      i = 0;
    }, maal(f) {
      u = c(f);
    }, get maalet() {
      return u;
    }, get pos() {
      return Math.trunc(r);
    } };
}
export { d as l };
