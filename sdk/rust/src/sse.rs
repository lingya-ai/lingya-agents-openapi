//! 增量 SSE frame 解码。

/// 可跨任意网络分片解析 SSE `data` 字段的状态机。
#[derive(Debug, Default)]
pub struct SseDecoder {
    pending: Vec<u8>,
    data_lines: Vec<String>,
    comments: Vec<String>,
    skip_lf: bool,
}

impl SseDecoder {
    /// 输入一个任意大小的网络分片并返回其中已完成的事件数据。
    pub fn push(&mut self, chunk: &[u8]) -> Result<Vec<String>, std::str::Utf8Error> {
        let mut completed = Vec::new();
        for &byte in chunk {
            if self.skip_lf { self.skip_lf = false; if byte == b'\n' { continue; } }
            if byte == b'\r' || byte == b'\n' {
                let line = std::mem::take(&mut self.pending);
                self.consume_line(std::str::from_utf8(&line)?, &mut completed);
                self.skip_lf = byte == b'\r';
            } else { self.pending.push(byte); }
        }
        Ok(completed)
    }

    /// Discard an incomplete frame at EOF.
    pub fn finish(self) -> Result<Vec<String>, std::str::Utf8Error> { Ok(Vec::new()) }

    /// Drain ready and heartbeat comments since the last push.
    pub fn take_comments(&mut self) -> Vec<String> { std::mem::take(&mut self.comments) }

    fn consume_line(&mut self, line: &str, completed: &mut Vec<String>) {
        if line.is_empty() {
            self.dispatch(completed);
        } else if let Some(comment) = line.strip_prefix(':') { self.comments.push(comment.trim().to_owned());
        } else if let Some(data) = line.strip_prefix("data:") {
            self.data_lines
                .push(data.strip_prefix(' ').unwrap_or(data).to_owned());
        }
    }

    fn dispatch(&mut self, completed: &mut Vec<String>) {
        if !self.data_lines.is_empty() {
            completed.push(self.data_lines.join("\n"));
            self.data_lines.clear();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::SseDecoder;

    #[test]
    fn decodes_chunks_multiline_data_and_heartbeats() {
        let mut decoder = SseDecoder::default();
        assert!(decoder.push(b": ping\r\nda").unwrap().is_empty());
        assert_eq!(
            decoder.push(b"ta: {\"a\":\r\ndata: 1}\r\n\r\n").unwrap(),
            vec!["{\"a\":\n1}"]
        );
        assert!(decoder.finish().unwrap().is_empty());
    }
}
