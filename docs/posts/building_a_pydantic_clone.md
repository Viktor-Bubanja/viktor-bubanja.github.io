---
draft: False
date: 2024-06-14
slug: building-a-pydantic-clone
authors:
  - viktorbubanja
---

# From Scratch - Building a Pydantic Clone

A couple of months ago, I attended a Python talk featuring some of the most amazing open-source contributors in the entire Python ecosystem, including Sebastián Ramírez, the creator of FastAPI, Armin Ronacher, the creator of Flask, and Samuel Colvin, the creator of [Pydantic](https://github.com/pydantic/pydantic). It was utterly inspiring to hear them talk about technology and their approach to development, but one moment in particular caught my attention. Sebastián Ramírez was praising Pydantic and recalled his first impression of using it: he thought it surely must be doing some crazy Python magic to be able to perform run-time type validation with built-in typing syntax. That made me realize how I took all sorts of Python libraries for granted and assumed they just "worked". I was immediately curious about how one might implement the functionality behind Pydantic and decided to recreate an MVP clone. In this post, I'll provide an overview of my solution and explore three relatively obscure Python topics in a practical context: descriptors, the `__init_subclass__` special method, and metaclasses.

Here is the [full project](https://github.com/Viktor-Bubanja/DIY-Pydantic) on Github if you're just interested in seeing the code.

<!-- more -->

# Project Scope and Core Features

To begin, let's decide on some scope. Pydantic is an amazing library with abundant features which I could never hope to implement on my own and the core functionality is what most interests me most, so I'll aim for the following features:

- A `BaseModel` class that performs runtime type checking when inherited, utilising standard typing syntax defined in the subclass.
- `@validator` and `@root_validator` methods that allow for field modifications and custom validations.
- `json` and `dict` methods to enable the conversion of our subclasses into JSON or dictionary formats.

Our implementation will allow initialization of our subclass using `OurSubclass(**some_dict)`, where `some_dict` may contain extra fields that are not present in the class. These extra fields will be ignored, mirroring Pydantic's behavior.

For simplicity, we will adhere to default configurations with two exceptions:

1. Type validation will be enforced during attribute assignment. Unlike Pydantic, where this [configuration option](https://docs.pydantic.dev/latest/api/config/#pydantic.config.ConfigDict.validate_assignment) is `False` by default, we will adopt a stricter approach and always perform validation.
2. Validators will be executed before setting attributes, assuming this [configuration option](https://docs.pydantic.dev/1.10/usage/validators/#pre-and-per-item-validators) to be `True` by default in our implementation.


# Introduction to Python Descriptors

Our solution makes use of Python concept known as [descriptors](https://docs.python.org/3/howto/descriptor.html). I'll provide a brief introduction to this topic.

*Note: descriptors are a big topic and contain enough content for an entire article. I will focus mostly on the use-case needed for the Pydantic clone and give just a short introduction (the same applies to the metaclass introduction later in this article).*

A descriptor is basically any object which implements the descriptor protocol, which includes the following methods:
```
__get__(self, obj, type=None) -> object
__set__(self, obj, value) -> None
__delete__(self, obj) -> None
```
This protocol has particular significant in Python. Typically, accessing an attribute like `some_object.some_attribute` to get, set, or delete it would result in a lookup in the class dictionary of `some_object`. However, if `some_attribute` is a descriptor, these protocol methods are invoked instead.

Here's a simplified example to clarify this concept:

**Without a descriptor:**
```python
class SomeClass:
    a = 2

print(SomeClass.a)  # => 2
```
In this case, Python directly retrieves `a` from `SomeClass.__dict__`.

**With a descriptor:**
```python
class SomeDescriptor:
    def __get__(self, obj, objtype=None):
        print("getting object")
        return 2

class SomeClass:
    a = SomeDescriptor()

print(SomeClass.a)
#  => getting object
#  => 2
```
Here, the `__get__` method in `SomeDescriptor` is bound to the getter for `a` in SomeClass, so accessing `SomeClass.a` triggers `__get__`.

This is such a contrived example that it would be fair to ask, "*why would we ever want to do that?*" The functionality of Pydantic provides a perfect opportunity.

# Applying Descriptors in Our Pydantic Clone

We aim to implement type checking validation every time an attribute in a subclass of `BaseModel` is set with each field requiring its own type-specific validation. Descriptors offer an elegant solution.

Let's implement that functionality now:

```python title="field.py"
from typing import Any


class Field:
    def __init__(self, name: str, field_type: type) -> None:
        self.name = name
        self.field_type = field_type

    def __set__(self, instance: Any, value: Any) -> None:
        if not isinstance(value, self.field_type):
            type_name = self.field_type.__name__
            msg = f"{self.name}: Input should be a valid {type_name}"
            raise TypeError(msg)

        instance.__dict__[self.name] = value
```
The `Field` initialiser accepts two arguments: the `name` of the field, and the `field_type` of the field. The only other method, `__set__` simply checks if the given value matches `self.field_type`; if not it raises a `TypeError`, otherwise it sets the attribute on the given instance. Because `Field` implements `__set__`, it implements the descriptor protocol and if a `Field` object is a class attribute of the `BaseModel` class (which we will implement soon), `__set__` will be called whenever we set the attribute on `BaseModel` (similarly to the above example where `__get__` was called whenever we executed `SomeClass.a`).

But how do we configure `BaseModel` so that each attribute in the subclass is an instance of `Field`? For that we need to make use of the very weird `__init_subclass__` Python special method.


# Overriding Subclass Creation
The `__init_subclass__` method was introduced in [PEP 487](https://peps.python.org/pep-0487/) as an alternative to metaclasses as a way to customise class creation. This special method is called when a subclass of the current class is defined. The first argument passed to `__init_subclass__` is the new subclass. We can do all kinds of weird stuff with this functionality, but here we will hook into the subclass creation in order to parse the type annotations of the subclass, create a `Field` object for each attribute, and set each `Field` object to a class attribute in the subclass.
```python title="main.py"
from inspect import get_annotations

from src.field import Field


class BaseModel:
    @classmethod
    def _fields(cls) -> dict[str, type]:
        return get_annotations(cls)

    def __init_subclass__(subcls) -> None:
        super().__init_subclass__()
        for name, field_type in subcls._fields().items():
            setattr(subcls, name, Field(name, field_type))
```
Here, `get_annotations` from `inspect` does all the heavy lifting of parsing the type annotations for each attribute and returns a dictionary with field names -> types. We will use these annotations in multiple places within `BaseModel` so we are separating this functionality into a private `_fields` method.
With this minimal amount of code, we already have a large chunk of functionality. The following code will raise `TypeError: a: Input should be a valid int`:
```python
class SimpleModel(BaseModel):
    a: int
    b: str

s = SimpleModel()
s.a = "not an int"  # => Raises TypeError
```
However, we are missing the functionality to be able to set our attributes in the initialiser like `SimpleModel(a=1, b="some str")`. We want to create an `__init__` method which can be inherited by subclasses of `BaseModel` and perform type checking for each input attribute.
```python title="main.py"
def __init__(self, **kwargs) -> None:
    # By iterating over self._fields instead of kwargs, we ignore any extra non-declared fields
    for name in self._fields():
        value = kwargs.get(name, None)
        setattr(self, name, value)
```
We simply iterate over each attribute defined in the subclass (retrieved from `self._fields()`) and set the attribute on `self` (which will be an instance of the `BaseModel` subclass which inherits this method) to the value from the keyword arguments.

*Note: since `__init_subclass__` runs when the subclass is defined, and `__init__` runs when a particular object is initialised, the `Field` objects for each attribute are already created by the time the initialiser runs so the validation logic is ready to be executed.*

All of the type validation is handled by the `__set__` method in the `Field` class which is invoked automatically by `setattr(self, name, value)`. Now we can successfully execute something like `SimpleModel(a=1, b="test")`, and we will get a `TypeError` if we input an incorrect type. For example, `SimpleModel(a=1, b=2)` will raise `TypeError: b: Input should be a valid str`.


![](https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHhrNzN6NHBkMGN6NjV4aHoyeWFyYzZpMnhjY2syZGJocnA3ZXp3OSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/yaJF9ESxq4gspYUIyn/giphy.gif)

How about the validator decorators? For this we will need to make use of Python metaclasses.


# Introduction to Python Metaclasses
I wrote an [entire article](./python_metaclasses.md) dedicated to [metaclasses](https://docs.python.org/3/reference/datamodel.html#metaclasses), so I recommend checking that out for a full explanation, but I will give a brief introduction here. Similarly to the `__init_subclass__` special method, metaclasses allow us to hook into class creation and implement our own custom logic. Behind the scenes, Python uses a class called `type` as a class factory. The following two snippets of code are equivalent:



```python
class SomeClass(SomeBaseClass):
    a = 1
...
SomeClass1 = type("SomeClass", (SomeBaseClass,), dict(a=1))
```
Basically `type` is a class which builds classes. A class which builds classes is called a "metaclass". `type` is the default metaclass used to build classes, but we can also define our own custom class factory.

A contrived example:
```python
class CustomMeta(type):
    def __new__(cls, name, bases, dct):
        dct['custom_method'] = lambda self: f"doing something very custom"
        return super().__new__(cls, name, bases, dct)

class MyClass(metaclass=CustomMeta):
    pass

instance = MyClass()
print(instance.custom_method())  # => doing something very custom
```
You might again ask, "*how could I possibly ever need this?*" Implementing the validator decorators in Pydantic presents another perfect opportunity for this obscure Python feature.

# Applying Metaclasses in our Pydantic Clone


Below is a simple example of the syntax of validators in Pydantic:
```python
@validator("field1", "field2")
def to_lower(cls, value):
    return value.lower()
```
When an object is initialised, Pydantic will call `to_lower` on the `field1` and `field2` fields and set their values to the output of the method. Validators can also include custom validation beyond simple type checking by raising errors under specific conditions.

Since `@validator` and `@root_validator` have similar functionality, let's focus on `@validator` for now then add `@root_validator` later.

We will implement the `@validator` method so that it stores two attributes on the decorated function object:

1. The list of fields which it applies to (passed in as arguments to the decorator)
2. An `is_validator` attribute set to `True` so that the decorated function can be identified later

Below is the implementation of `validator`:
```python title="validator.py"
from typing import Callable


def validator(*field_names) -> Callable:
    def decorator(func):
        func.field_names = field_names
        func.is_validator = True
        return func

    return decorator
```
When we define our subclass of `BaseModel`, we want to find all `@validator` functions and bind them as class methods while storing which field names need to be validated with which validators.

We can then achieve this with the following metaclass:
```python title="model_metaclass.py"
class ModelMetaclass(type):
    def __new__(cls, name, bases, namespace):
        new_class = super().__new__(cls, name, bases, namespace)

        new_class._validators = {}
        new_class._root_validators = []

        for validator in cls._get_validators(namespace):
            field_names = getattr(validator, "field_names", ())
            bound_method = classmethod(validator)
            for field_name in field_names:
                if field_name not in new_class._validators:
                    new_class._validators[field_name] = []
                new_class._validators[field_name].append(bound_method)

        return new_class

    @classmethod
    def _get_validators(cls, namespace):
        return (
            item
            for item in cls._iterate_namespace(namespace)
            if getattr(item, "is_validator", False)
        )

    @staticmethod
    def _iterate_namespace(namespace):
        return namespace.values()
```
*Note: the reason we need to bind the validators as class methods is because we want the first argument of the methods to be `cls` (as in Pydantic), otherwise we would simply store function objects.*

The `namespace` parameter of `__new__` contains a dictionary with all the attributes, methods, and other class-level items defined within the class body that is being constructed. We can iterate over all of these items to find our decorated methods (recall that our decorator sets `is_validator` to `True` on the decorated method allowing us to identify them).

To configure our `BaseModel` class to be built with our custom `ModelMetaclass`, we update the class definition like so:
```python title="main.py"
class BaseModel(metaclass=ModelMetaclass):
```

Now, when we define a subclass of `BaseModel` with a `@validator` decorator, a dictionary of fields names -> validator class methods will be stored in a `_validators` class attribute. Almost there.

![](https://media.giphy.com/media/l0HUpjhXKfTiscMog/giphy.gif?cid=790b7611m9632rqqtcgc3v0iu45yrftvf2geohvu2g5ellib&ep=v1_gifs_search&rid=giphy.gif&ct=g)


We just need to update `BaseModel` to actually run the validators when objects are initialised:
```python title="main.py"
def __init__(self, **kwargs) -> None:
   for name in self._fields():
      value = kwargs.get(name, None)
      if validators := self._validators.get(name):
          for validator in validators:
              value = validator.__func__(self.__class__, value)
      setattr(self, name, value)
```
For each attribute, we check if it has any validators in the `_validators` dictionary; if so, we execute each validator in a chain, passing the result of one to the next. Finally, our validators work!
Let's test it out:
```python
class SomeModel(BaseModel):
    name: str
    age: int

    @validator("name")
    def to_lower(cls, value: str) -> str:
        return value.upper()

    @validator("name")
    def validate_name(cls, value: str) -> str:
        if not value.isalpha():
            raise ValueError("Name should only contain alphabets")
        return value

    @validator("age")
    def validate_age(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Age cannot be negative")
        return value

SomeModel(name="john", age=25)  # => name='JOHN' age=25
SomeModel(name="john2", age=25)  # => ValueError: Name should only contain alphabets
SomeModel(name="john", age=-1)  # => ValueError: Age cannot be negative
```
Perfect! Our validators are working as expected and are able to both modify our attributes and perform custom validation.
Adding support for `root_validator` requires minimal changes:
```python title="validator.py"
def root_validator() -> Callable:
    def decorator(func):
        func.is_root_validator = True
        return func

    return decorator
```
```python title="model_metaclass.py"
class ModelMetaclass(type):
    def __new__(cls, name, bases, namespace):
        new_class = super().__new__(cls, name, bases, namespace)

        new_class._validators = {}
        new_class._root_validators = []

        for validator in cls._get_validators(namespace):
            field_names = getattr(validator, "field_names", ())
            bound_method = classmethod(validator)
            for field_name in field_names:
                if field_name not in new_class._validators:
                    new_class._validators[field_name] = []
                new_class._validators[field_name].append(bound_method)

        # Added functionality to save root validator class methods
        new_class._root_validators = [
            classmethod(root_validator)
            for root_validator in cls._get_root_validators(namespace)
        ]

        return new_class

    @classmethod
    def _get_validators(cls, namespace):
        return (
            item
            for item in cls._iterate_namespace(namespace)
            if getattr(item, "is_validator", False)
        )

    # Added a method to find root validators
    @classmethod
    def _get_root_validators(cls, namespace):
        return (
            item
            for item in cls._iterate_namespace(namespace)
            if getattr(item, "is_root_validator", False)
        )

    @staticmethod
    def _iterate_namespace(namespace):
        return namespace.values()
```
and within `BaseModel`:
```python title="main.py"
def __init__(self, **kwargs) -> None:
    for validator in self._root_validators:
        kwargs = validator.__func__(self.__class__, kwargs)
    for name in self._fields():
        value = kwargs.get(name, None)
        if validators := self._validators.get(name):
            for validator in validators:
                value = validator.__func__(self.__class__, value)
        setattr(self, name, value)
```
Now our root validator works as expected too.
```python
class SomeModel(BaseModel):
    first_name: str
    last_name: str
    full_name: str

    @root_validator()
    def build_full_name(cls, values):
        values["full_name"] = values["first_name"] + " " + values["last_name"]
        return values

s = SomeModel(first_name="Uncle", last_name="Bob")
print(s.full_name)  # => Uncle Bob
```

Very nice 👌

As a last step, we will add the following methods to `BaseModel`:
```python title="main.py"
def dict(self) -> dict[str, Any]:
    return {
        name: getattr(self, name)
        for name, attr in self.__class__.__dict__.items()
        if isinstance(attr, Field)
    }

def json(self) -> str:
    return json.dumps(self.dict())

def __repr__(self) -> str:
    kwargs = ", ".join(f"{key}={value!r}" for key, value in self.dict().items())
    class_name = self.__class__.__name__
    return f"{class_name}({kwargs})"

def __str__(self) -> str:
    return " ".join(f"{key}={value!r}" for key, value in self.dict().items())
```
The `dict` and `json` methods of Pydantic `BaseModel` objects come in very handy so we are adding them here for completion. Their implementations are self-explanatory. The second two methods are added to mimic the behaviour of printing a Pydantic `BaseModel` object, either in an interactive console (which invokes `repr`) or its string representation.

*Note: we use `value!r` within `__repr__` so that the `__repr__` method is called on each value. E.g. if we have a field which is a subclass of `BaseModel`, we want to again invoke `repr` on the field.*

We now have a fully functioning MVP of Pydantic!

Thanks for reading ⭐
