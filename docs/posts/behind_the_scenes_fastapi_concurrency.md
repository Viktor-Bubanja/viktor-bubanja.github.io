---
draft: False
date: 2024-05-20
slug: behind-the-scenes-fastapi-concurrency
authors:
  - viktorbubanja
---
# Behind the Scenes: Concurrency in FastAPI

The [FastAPI documentation](https://fastapi.tiangolo.com/async/) gives practical information on how to handle concurrency in APIs; however, it doesn't go deeper into the implementation details which are sometimes necessary to understand how to achieve optimal performance under different scenarios. I hope to illuminate some of these details here.

<!-- more -->

# Concurrency in FastAPI
FastAPI achieves concurrency in two ways: multi-threading or a single-threaded event loop.


**Multi-threading**

When you define an endpoint handler with simply `def`, the endpoint will run in a thread from an external threadpool (handled by Uvicorn, or whatever ASGI server implementation you’re running the server with). This means even if you have I/O blocking code within your endpoint function, e.g. database calls, the thread running this code will not block your server thread and your server will be able to handle concurrent requests performantly.

**Single-threaded event loop**

When you define an endpoint with `async def`, the endpoint will run in a single-thread controlled by an event loop (you might be familiar with this model from [concurrency in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)). You should use `async def` if the code within the function is using `await` to run I/O blocking tasks, e.g. making an async call to an API using aiohttp.

Note: the [FastAPI documentation](https://fastapi.tiangolo.com/async/) goes into detail about concurrency and parallelism so I won't go into these concepts here.

# When to use which

If your I/O blocking code does not support async I/O, i.e. cannot be awaited, then always use `def` (If you use `async def` without awaiting code, only one thread will be used for the endpoint and each execution will block the next execution of the endpoint - so never do this). If your I/O blocking code can support async I/O, you can either choose to await the call to the I/O code and define your endpoint with `async def`, or not to `await` it and define your endpoint like `def`.

The performance between the two options is approximately the same until the number of parallel requests exceeds the number of threads in the external threadpool. If you are using [Uvicorn](https://www.uvicorn.org/) (default ASGI server program installed with FastAPI), the number of threads in the threadpool is the default defined by `concurrent.futures.ThreadPoolExecutor`, i.e. the [number of CPU cores multiplied by 5](https://docs.python.org/3/library/concurrent.futures.html#concurrent.futures.ThreadPoolExecutor) (e.g. on my Apple M1 laptop that’s 8*5 = 40). When the number of parallel requests exceeds this number, the single-threaded event loop becomes faster.

Deciding whether to use `async def` and `def` then comes down to a combination of the usage of your API as well as the amount of work required to implement either version.

# Experiment
If you’re interested, below is a description of the experiment I conducted to help with my understanding. I’ve included code snippets in case it’s useful for you to run the experiment too.

First, I created a simple FastAPI server with two endpoint: `/async` and `/sync`; `/async` being defined like `async def` with an `await asyncio.sleep(2)` (asynchronous sleep) and `/non_async` being defined like `def` with a `time.sleep(2)` (synchronous sleep). In the response of each endpoint, I returned the identifier of the thread that was running the function (just for visibility).

This is the implementation of the server:


```python
import asyncio
import threading
import time

from fastapi import FastAPI

app = FastAPI()

@app.get("/async")
async def async_get():
    thread = threading.current_thread()
    await asyncio.sleep(2)
    return {"message": f"Current thread name: {thread.name}, identifier: {thread.ident}"}

@app.get("/sync")
def get():
    thread = threading.current_thread()
    time.sleep(2)
    return {"message": f"Current thread name: {thread.name}, identifier: {thread.ident}"}
```

Then, I wrote a script to send concurrent requests to the server:


```python
import aiohttp
import asyncio
import time

max_workers = 100

async def get_request(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            result = await response.text()
            print(result)

async def main():
    url = 'http://localhost:8000/'
    path = "async" #  or "sync"
    start_time = time.monotonic()
    tasks = [asyncio.create_task(get_request(url + path)) for _ in range(max_workers)]
    await asyncio.gather(*tasks)
    end_time = time.monotonic()
    time_taken = end_time - start_time
    print(f"Time taken: {time_taken:.3f}")

asyncio.run(main())
```


# Results
| Number of Concurrent Requests | Async Duration (s) | Sync Duration (s) |
|-------------------------------|--------------------|------------------------|
| 20                            | 2.063              | 2.083                  |
| 40                            | 2.086              | 2.091                  |
| 80                            | 2.134              | 4.132                  |
| 120                           | 2.173              | 6.136                  |


We can see from the experiment results how the multi-threading and the single-threaded event loop implementations had similar performance until the number of concurrent requests exceeded the number of threads available in the threadpool (40 on my local machine). As the number of concurrent requests exceeded this point, the single-threaded event loop latency remained relatively stable while the multi-threading latency increased linearly.

# Conclusion

I hope this shines some light on what is happening behind the scenes in FastAPI when you define your API endpoints with `def` vs `async def` and helps you make an informed decision on when to use which.

To summarise:

* If your I/O blocking code does not support async I/O, i.e. cannot be awaited, then use `def`.
* If your I/O blocking code can support async I/O, use `await` and define your endpoint with `async def` if the number of concurrent executions may be higher than the number of threads in your threadpool; otherwise `def` without `await` statements will have the same performance so choose the simpler implementation.

I hope you found something useful in this article! 😃
