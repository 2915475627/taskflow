package com.taskflow.model;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import java.io.IOException;

public class NodeTypeDeserializer extends JsonDeserializer<NodeType> {
    @Override
    public NodeType deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        String value = parser.getValueAsString();
        return NodeType.fromValue(value);
    }
}
