// A promise we can settle from outside the code under test
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function abortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}

export function timeoutError() {
  return new DOMException("The operation timed out.", "TimeoutError");
}

// A response whose body only arrives when we say so (or fails when we say so)
export function slowBodyResponse(status = 200) {
  const body = deferred<string>();
  const response = new Response(null, { status });
  response.text = () => body.promise;
  response.json = () => body.promise.then((text) => JSON.parse(text));
  return { response, body };
}
