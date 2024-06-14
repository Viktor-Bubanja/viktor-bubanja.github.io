---
draft: False
date: 2022-11-09
slug: static-duck-typing-in-python
authors:
  - viktorbubanja
---
# Static Duck Typing in Python

At [HeyJobs](https://www.heyjobs.co/de-de), we make heavy use of type hints in our Python codebases and include MyPy as a blocking check in our CI/CD builds. Static type checking can be invaluable for preventing bugs and improving code readability; however, it also has its own drawbacks, including removing some of the flexibility offered by duck typing. In this article, I walk through a work-around for limitation: static duck typing.
<!-- more -->

# Static Type Checks vs Duck Typing

Type hints were added in [PEP 484](https://peps.python.org/pep-0484/) which allowed for static type checking from third party tools. However, they allowed Python users to only specify [nominal subtyping](https://en.wikipedia.org/wiki/Nominal_type_system) (i.e. typing strictly based on class hierarchy). Why was this problematic ("problematic" might be dramatic but we can at least say limiting)?
We all know that one of the beautiful advantages of Python which gives it so much flexibility is duck typing. As a refresher, this code is perfectly acceptable:

```python
class Duck:
    def quack(self):
        return "Quack"

class Human:
    def quack(self):
        return "I'm uncomfortable"

def make_it_quack(thing_that_quacks: Duck):
    print(thing_that_quacks.quack())

make_it_quack(Duck())  # => "Quack"
make_it_quack(Human())  # => "I'm uncomfortable with this."
```
In other words, Python doesn't care about the exact types of objects; it only cares that they implement the necessary methods or attributes (or in more proverbial words, "If it walks like a duck and it quacks like a duck, then it must be a duck."). From the [language documentation](https://docs.python.org/3/glossary.html#term-duck-typing),
> "By emphasizing interfaces rather than specific types, well-designed code improves its flexibility by allowing polymorphic substitution."


However, if we want to add typing to this program, we are unable to do so with nominal typing since `Duck` and `Human` aren't in the same class hierarchy. If we were to change the `make_it_quack` definition to `make_it_quack(thing_that_quacks: Duck)`, since `Human` isn't a subclass of `Duck`, a static type checker like MyPy would raise an error: 
```python
error: Argument 1 to "make_it_quack" has incompatible type "Human"; expected "Duck"  [arg-type]
```
We can implement a work-around like `make_it_quack(thing_that_quacks: Duck | Human)` but then we immediately lose the flexibility of duck typing; every additional class that supports `quack` that may be used as an input to this method will require updating the method definition. Ideally, we would want to be able to define the typing of this method as: "`thing_that_quacks` should be anything that has the method `quack`", i.e. an explicit version of duck typing. Enter static duck typing.



# Static Duck Typing

In [PEP 544](https://peps.python.org/pep-0544/), Protocols were added which allowed structural subtyping (also known as static duck typing). Static duck typing lets us have static type checking along with *structural typing.* In other words, when checking the type of an object, what matters is its structure (i.e. what attributes and methods it has), instead of its name or the name of its parents (nominal typing).

We can achieve static duck typing by using protocols from `typing` or by using Abstract Base Classes (ABCs).

## Static Duck Typing with Protocols

Applying Protocols to our earlier example:

```python
from typing import Protocol

class SupportsQuack(Protocol):
    def quack(self) -> None: ...

class Human():
    def quack(self) -> str:
        return "I'm uncomfortable"

def make_it_quack(thing_that_quacks: Quacker) -> None:
    print(thing_that_quacks.quack())
```
Now our static type checker is happy, and we can pass any object which implements `quack` to `make_it_quack`, i.e. we are back to duck typing but with the benefits of static type checking.

Note: `SupportsX` is the most common naming convention for defining custom protocols.

## Static Duck Typing with ABCs

Most ABCs in Python implement a `__subclasshook__` method. This method implements functionality to determine whether a class should be considered a subclass of the abstract base class (usually by checking if the class has implemented the necessary methods).

For example, this is the `__subclasshook__` method within `Iterable` (CPython source code [here](https://github.com/python/cpython/blob/main/Lib/_collections_abc.py)):

```python
class Iterable(metaclass=ABCMeta):

    __slots__ = ()

    @abstractmethod
    def __iter__(self):
        while False:
            yield None

    @classmethod
    def __subclasshook__(cls, C):
        if cls is Iterable:
            return _check_methods(C, "__iter__")
        return NotImplemented
```

As you can see, it just checks if the class `cls` implements the method `__iter__` (`_check_methods` is implemented in the same module and checks if the given class implements the given method).

That means, if we have some class that defines `__iter__`, it will be considered a subclass of `Iterable`, even if it isn't an instance of `Iterable`:

```python
class SomeListThing():
    def __init__(self, things):
        self.things = things

    def __iter__(self):
        for thing in self.things:
            yield thing

print(issubclass(SomeListThing, Iterable))  # => True
print(isinstance(SomeListThing, Iterable))  # => False
```
This is where the static duck typing comes in: we can pass our `SomeListThing` object into a function which accepts `Iterable` objects as an argument and it will pass static type checking, even though our class doesn't explicitly inherit from `Iterable`. Python accepts `SomeListThing` as a subclass of `Iterable` not because it inherits it, but because it satisfies the requirements of `__subclasshook__`. We have thus side-stepped nominal typing.

# Conclusion
While Python's dynamic nature and duck typing provide great flexibility and ease of use, they often come with challenges in large-scale applications where type safety is crucial. The balance between traditional duck typing and static type checking can be achieved by incorporating Python's static duck typing capabilities, namely Protocols and Abstract Base Classes (ABCs). By leveraging PEP 544's Protocols, we can get the benefits of static type checking while maintaining the polymorphism and flexibility provided by duck typing, which is pretty neat 👌
