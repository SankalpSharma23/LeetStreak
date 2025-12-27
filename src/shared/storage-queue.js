/**
 * Storage Queue - Prevents race conditions on concurrent storage writes
 * Serializes all storage operations to prevent conflicts
 */

class StorageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }
  
  /**
   * Add operation to queue
   * @param {Function} operation - Async operation to execute
   * @returns {Promise} Result of the operation
   */
  async enqueue(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.processQueue();
    });
  }
  
  /**
   * Process queued operations sequentially
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const { operation, resolve, reject } = this.queue.shift();
      
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    
    this.processing = false;
  }
}

// Export singleton instance
export const storageQueue = new StorageQueue();
