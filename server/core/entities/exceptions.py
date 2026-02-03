class ImageNotFoundException(Exception):
    def __init__(self, message):
        self.message = message

class EmptyImageException(Exception):
    def __init__(self, message):
        self.message = message