---
draft: False
date: 2024-06-10
slug: python-metaclasses
authors:
  - viktorbubanja
---

# Python Metaclasses - For Curiosity's Sake

Python metaclasses might seem arcane and utterly not worth your time learning. You might say: "surely I'll never need to use this". And to be frank, you almost certainly won't, and neither will I. Nonetheless, if you want to make sense of code you see in the wild in open-source libraries, such as Pydantic, which makes heavy use of the concept, or in CPython source code, it's worth knowing. And, one day you might come across a situation where metaclasses present the perfect solution, so you can never have too many tools in your tool belt (although I hope you don't start thinking everything looks like a nail because there will likely almost always be a simpler, more readable solution).

With that demoralising intro out of the way, let's first begin with a deeper look into how classes operate within Python.

<!-- more -->


# Classes in Python

You might be used to the concept that classes are pieces of code that bundle data and functionality together. But in Python, classes are slightly more than that. They themselves are objects (like every single other thing in Python, including functions and even modules).

We are all familiar with the typical way of defining a class:

```python
class SomeClass:
    pass
```

Here, `SomeClass` is an object. It is capable of instantiating other objects, which we call *instances,* but it is still a normal object and therefore can be operated on as we would expect:

```python
SomeClass.some_variable = "abc" # Attach attributes
some_other_variable = SomeClass  # Assign it to a variable
SomeClass == SomeClass  # => True
SomeClass == SomeOtherClass  # => False
```
Some of us might be less familiar with a second way of creating classes which can be done on the fly: using `type(name, bases, attrs)`, where `name` is the name of the class, `bases` is an optional tuple containing the parent classes, and `attrs` contains attribute names and values (callables become methods, values become class attributes).

*Note: this is a completely different usage compared to getting the type of an object, like:*

```python
>>> print(type('some string'))
<type 'str'>
```

Here is an example of how to create a class using `type`:

```python
SomeOtherClass = type("SomeOtherClass", (SomeClass,), {})
print(SomeOtherClass())  # <__main__.SomeOtherClass object at 0x1024bba30>
```

If we want to be able to initialise our class with specific attributes, we can define an `__init__` method and pass it into `attrs`:

```python
def __init__(self, x, y):
    self.x = x
    self.y = y

SomeOtherClass = type("SomeOtherClass", (SomeClass,), {"__init__": __init__})
s = SomeOtherClass(x=10, y=20)
print(s.x, s.y)  # => 10 20
```

We can also dynamically add any other methods just like adding methods to any other object:

```python
SomeOtherClass.do_something = lambda self: print("Doing something")
s = SomeOtherClass()
s.do_something()  # => "Doing something"
```

# Metaclasses in Python
How is this related to metaclasses?

From the above preamble and from the hint in the name “metaclass”, you might be able to guess what metaclasses are: *classes that create other classes*. Just like how normal classes allow us to instantiate objects, metaclasses allow us to instantiate class objects.

Whenever a class is created, a metaclass is used; if no metaclass is given, `type` is used as the default. We can see this by observing the value of `__class__` on any class defined the usual way (with the default metaclass):

```python
print(SomeClass.__class__)  # => <class 'type'>
```

*Quick distinction: classes (or built-in types such as `str`, `int`, etc) are not subclasses of `type`; they are instances of `type` and subclasses of `object`.*

However, we have the option to use a different metaclass than `type`. We can do so by passing in a keyword argument when defining a class (this is Python 3, the syntax is slightly different for Python 2):

```python
class SomeMetaClass(type):
    pass

class SomeClass(metaclass=SomeMetaclass):
    pass
   
print(SomeClass.__class__)  # => <class '__main__.SomeMetaclass'>
```

Now `SomeMetaclass` instead of `type` will be used to create `SomeClass`.

*Note: when creating custom metaclasses we set `type` as a base class so that we can inherit the functionality for class creation and only override the behaviour we wish.*

Typically metaclasses will add a custom implementation for something like `__call__` or `__new__` which performs some desired behaviour before calling the same method in the super class. In this way, you can think of metaclasses as allowing us to *intercept* the creation of our classes and do some extra work before returning the class.

## Short Digression on `__new__`
We often refer to `__init__` as the "constructor" of a class but this isn't fully accurate. The first argument to the method is `self` which means the object has already been created before the `__init__` method was called. The class method that creates this object is `__new__`. When we initialise an object of a class, Python will first call `__new__` on the class, then pass the result as the first argument to `__init__` (provided that the returned object is an instance of the same class; otherwise it simply skips calling `__init__`). Overriding `__new__` in our metaclass allows us to alter the logic for building a class.

This might still sound like abstract nonsense so on to some practical examples:

# Real-World Examples
## Singleton

Metaclasses in Python provide a neat solution for creating a singleton class:

```python
class SingletonMetaclass(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            instance = super().__call__(*args, **kwargs)
            cls._instances[cls] = instance
        return cls._instances[cls]

class Client(metaclass=SingletonMetaclass):
    def __init__(self, x, y):
        self.x = x
        self.y = y

a = Client(1, 2)
b = Client(3, 4)
print(b.x, b.y)  # 1, 2
```

Here, `__call__` is overwritten (`__call__` is the [special method](https://docs.python.org/3/reference/datamodel.html#specialnames) that gets executed when an object is “called” as a function), which means whenever we initialise a `Client` object, the overwritten method within `SingletonMetaclass` is executed. The metaclass keeps a set of all instances of the class; if we try to initialise a new object while one already exists, it will simply return the existing object instead of creating a new one.

## Abstract base classes

As you may already know, we can define an [abstract base class](https://docs.python.org/3/library/abc.html) in Python by setting `metaclass=ABCMeta` in our class definition:

```python
from abc import ABCMeta

class MyABC(metaclass=ABCMeta):
    pass
```

Python will then prevent us from instantiating an object of a class that doesn’t implement all abstract methods of the abstract base class. Under the hood, when we try to instantiate a class, Python checks whether the class's `__abstractmethods__` attribute is empty; if not, Python will raise `TypeError: Can't instantiate abstract class A with abstract methods foo, bar`.

The CPython implementation of the `abstractmethod`  [decorator](https://github.com/python/cpython/blob/99d945c0c006e3246ac00338e37c443c6e08fc5c/Lib/abc.py) is simple:

```python
def abstractmethod(funcobj):
    """<removing long comment>"""
    funcobj.__isabstractmethod__ = True
    return funcobj
```

It just sets the `__isabstractmethod__` attribute of the decorated function to `True`. Then, the `__new__` method of the `ABCMeta` metaclass calls the `__new__` method in `super()` before adding all method names that are decorated with `@abstractmethod` in the abstract base class (and all base classes) to the `__abstractmethods__` attribute. As a result, if we try to instantiate a class with metaclass `ABCMeta` without implementing all abstract methods, we will receive a `ValueError`. Below is a simplified version of the `ABCMeta` [source code](https://github.com/python/cpython/blob/main/Lib/_py_abc.py) (removing everything not related to this content but still leaving it functional):

```python
class ABCMeta(type):
    def __new__(mcls, name, bases, namespace, /, **kwargs):
        cls = super().__new__(mcls, name, bases, namespace, **kwargs)
        abstracts = {name
                     for name, value in namespace.items()
                     if getattr(value, "__isabstractmethod__", False)}
        for base in bases:
            for name in getattr(base, "__abstractmethods__", set()):
                value = getattr(cls, name, None)
                if getattr(value, "__isabstractmethod__", False):
                    abstracts.add(name)
        cls.__abstractmethods__ = frozenset(abstracts)
        return cls
```
If you're interested, you can copy paste the above code snippet in your IDE, define a class with `metaclass=ABCMeta`, and observe how a `ValueError` is raised if an abstract method is not implemented.

I hope you found something interesting in this article 🙂
